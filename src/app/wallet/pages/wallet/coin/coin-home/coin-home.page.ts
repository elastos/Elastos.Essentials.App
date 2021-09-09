/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Config } from '../../../../config/Config';
import { CoinType, StandardCoinName } from '../../../../model/Coin';
import { GenericTransaction, TransactionInfo } from '../../../../model/providers/transaction.types';
import { ERC20SubWallet } from '../../../../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../../../../model/wallets/subwallet';
import { CoinTransferService, TransferType } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { LocalStorage } from '../../../../services/storage.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-home',
    templateUrl: './coin-home.page.html',
    styleUrls: ['./coin-home.page.scss'],
})
export class CoinHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('fetchmoretrigger', { static: true }) fetchMoreTrigger: ElementRef;

    public masterWalletInfo = '';
    public networkWallet: NetworkWallet = null;
    public subWallet: AnySubWallet = null;
    public elastosChainCode: StandardCoinName = null;
    public transferList: TransactionInfo[] = [];
    public transactionsLoaded = false;
    private transactions: GenericTransaction[] = []; // raw transactions received from the providers / cache

    // Total transactions today
    public todaysTransactions = 0;
    //private MaxCount = 0;
    private start = 0;

    // Helpers
    public WalletUtil = WalletUtil;
    public SELA = Config.SELA;
    public CoinType = CoinType;

    public canFetchMore = true;
    public shouldShowLoadingSpinner = false;
    // Observer that detects when the "fetch more trigger" UI item crosses the ion-content, which means we
    // are at the bottom of the list.
    private fetchMoreTriggerObserver: IntersectionObserver;

    private syncSubscription: Subscription = null;
    private syncCompletedSubscription: Subscription = null;
    private transactionListChangedSubscription: Subscription = null;
    private transactionFetchStatusChangedSubscription: Subscription = null;

    private updateInterval = null;
    private updateTmeout = null;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        private coinTransferService: CoinTransferService,
        public native: Native,
        public events: Events,
        private zone: NgZone,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        public uiService: UiService,
        private storage: LocalStorage
    ) {
        this.init();
    }

    ngAfterViewInit() {
        const options: IntersectionObserverInit = {
            root: this.fetchMoreTrigger.nativeElement.closest('ion-content')
        };
        this.fetchMoreTriggerObserver = new IntersectionObserver((data: IntersectionObserverEntry[]): IntersectionObserverCallback => {
            if (data[0].isIntersecting) {
                this.fetchMoreTransactions();
                //this.observer.disconnect();
                return;
            }
        }, options);
        this.fetchMoreTriggerObserver.observe(this.fetchMoreTrigger.nativeElement);
    }

    ionViewWillEnter() {
        this.coinTransferService.elastosChainCode = this.elastosChainCode;
        this.titleBar.setTitle(this.translate.instant('wallet.coin-transactions'));
        void this.initData();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.transactionListChangedSubscription = this.subWallet.transactionsListChanged().subscribe((value) => {
            if (value === null) return; // null is the initial value.

            void this.zone.run(async () => {
                await this.updateTransactions();
            });
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.transactionFetchStatusChangedSubscription = this.subWallet.transactionsFetchStatusChanged().subscribe(isFetching => {
            this.zone.run(() => {
                this.shouldShowLoadingSpinner = isFetching;
            });
        });
    }

    ionViewDidLeave() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.updateTmeout) {
            clearTimeout(this.updateTmeout);
            this.updateTmeout = null;
        }
        if (this.syncSubscription) {
            this.syncSubscription.unsubscribe();
            this.syncSubscription = null;
        }
        if (this.syncCompletedSubscription) {
            this.syncCompletedSubscription.unsubscribe();
            this.syncCompletedSubscription = null;
        }
        if (this.transactionListChangedSubscription) {
            this.transactionListChangedSubscription.unsubscribe();
            this.transactionListChangedSubscription = null;
        }
        if (this.transactionFetchStatusChangedSubscription) {
            this.transactionFetchStatusChangedSubscription.unsubscribe();
            this.transactionFetchStatusChangedSubscription = null;
        }
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            let masterWalletId = navigation.extras.state.masterWalletId;
            this.elastosChainCode = navigation.extras.state.elastosChainCode as StandardCoinName;

            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);

            this.coinTransferService.reset();
            this.coinTransferService.masterWalletId = masterWalletId;
            this.coinTransferService.elastosChainCode = this.elastosChainCode;
            this.coinTransferService.walletInfo = Util.clone(this.networkWallet.masterWallet.account);

            this.subWallet = this.networkWallet.getSubWallet(this.elastosChainCode);
        }
    }

    ngOnInit() {
    }

    initData(refreshing = false) {
        this.shouldShowLoadingSpinner = true;
        this.subWallet.fetchNewestTransactions();
    }

    async updateTransactions() {
        this.start = 0;
        //this.MaxCount = 0;
        this.transferList = [];
        this.todaysTransactions = 0;
        await this.getAllTx();
    }

    async updateWalletInfo() {
        // Update balance and get the latest transactions.
        await this.subWallet.update();
    }

    startUpdateInterval() {
        if (this.updateInterval === null) {
            this.updateInterval = setInterval(() => {
                void this.updateWalletInfo();
            }, 30000);// 30s
        }
    }

    restartUpdateInterval() {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        this.startUpdateInterval();
    }

    chainIsELA(): boolean {
        return this.elastosChainCode === StandardCoinName.ELA;
    }

    chainIsDID(): boolean {
        return this.elastosChainCode === StandardCoinName.IDChain;
    }

    chainIsETHSC(): boolean {
        return this.elastosChainCode === StandardCoinName.ETHSC;
    }

    chainIsERC20(): boolean {
        return this.subWallet instanceof ERC20SubWallet;
    }

    async getAllTx() {
        let transactions = await this.subWallet.getTransactions();
        if (!transactions) {
            Logger.log('wallet', "Can not get transaction");
            this.canFetchMore = false;
            return;
        }
        this.transactionsLoaded = true;
        Logger.log('wallet', "Got all transactions: ", transactions);

        //const transactions = allTransactions.transactions;
        //this.MaxCount = allTransactions.total;
        //this.MaxCount = transactions.length;

        //if (this.start >= this.transactions.length) {
        if (this.subWallet.canFetchMoreTransactions()) {
            console.log("DEBUG coinhome can fetch more");
            this.canFetchMore = true;
        }
        else {
            console.log("DEBUG coinhome can NOT fetch more");
            this.canFetchMore = false;
        }
        /* } else {
            console.log("DEBUG coinhome getAllTx() B");
            this.canShowMore = true;
        } */

        /* TODO - "can fetch more" to be called on the subwalelt -> transactions provider if (this.MaxCount <= 20) {
            this.canShowMore = false;
        } */

        for (let transaction of transactions) {
            const transactionInfo = await this.subWallet.getTransactionInfo(transaction, this.translate);
            if (!transactionInfo) {
                Logger.warn('wallet', 'Invalid transaction ', transaction);
                continue;
            }

            if (this.chainIsETHSC() || this.chainIsERC20()) {
                transactionInfo.amount = transactionInfo.amount.isInteger() ? transactionInfo.amount.integerValue() : transactionInfo.amount;
            }

            // Check if transaction was made today and increment our counter if so.
            this.countAsDailyTransactionIfNeeded(transactionInfo.timestamp);

            this.transferList.push(transactionInfo);
        }
    }

    onItem(item) {
        this.native.go(
            '/wallet/coin-tx-info',
            {
                masterWalletId: this.networkWallet.id,
                elastosChainCode: this.elastosChainCode,
                transactionInfo: item
            }
        );
    }

    receiveFunds() {
        this.native.go('/wallet/coin-receive');
    }

    sendFunds() {
        this.coinTransferService.transferType = TransferType.SEND;
        this.native.go('/wallet/coin-transfer');
    }

    transferFunds() {
        if (this.chainIsELA()) {
            this.rechargeFunds();
        } else {
            this.withdrawFunds();
        }
    }

    // mainchain to sidechain
    rechargeFunds() {
        this.coinTransferService.transferType = TransferType.RECHARGE;
        this.native.go('/wallet/coin-select');
    }

    // sidechain to mainchain
    withdrawFunds() {
        this.coinTransferService.transferType = TransferType.WITHDRAW;
        this.native.go('/wallet/coin-transfer');
    }

    fetchMoreTransactions() {
        this.restartUpdateInterval();
        this.start = this.transactions.length;

        // Give time for the spinner to show.
        runDelayed(() => this.subWallet.fetchMoreTransactions(), 100);
    }

    async doRefresh(event): Promise<void> {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            await this.storage.setVisit(true);
        }

        void this.initData(true);
        this.currencyService.fetch();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    getIndexByTxId(txid: string) {
        return this.transferList.findIndex(e => e.txid === txid);
    }

    checkUTXOCount() {
        // Check UTXOs only for SPV based coins.
        if ((this.subWallet.type === CoinType.STANDARD) && !this.chainIsETHSC()) {
            // TODO
            // if (this.walletManager.needToCheckUTXOCountForConsolidation) {
            //     let UTXOsJson = await this.walletManager.spvBridge.getAllUTXOs(this.masterWallet.id, this.elastosChainCode, 0, 1, '');
            //     Logger.log('wallet', 'UTXOsJson:', UTXOsJson);
            //     const UTXOsCount = this.translate.instant('wallet.text-consolidate-UTXO-counts', {count: UTXOsJson.MaxCount});
            //     if (UTXOsJson.MaxCount >= Config.UTXO_CONSOLIDATE_PROMPT_THRESHOLD) {
            //         let ret = await this.popupProvider.ionicConfirmWithSubTitle('wallet.text-consolidate-prompt', UTXOsCount, 'wallet.text-consolidate-note')
            //         if (ret) {
            //             await this.createConsolidateTransaction();
            //         }
            //     }

            //     this.walletManager.needToCheckUTXOCountForConsolidation = false;
            // }
        }
    }

    async createConsolidateTransaction() {
        // TODO
        // let rawTx = await this.walletManager.spvBridge.createConsolidateTransaction(this.masterWallet.id, this.elastosChainCode, '');
        // Logger.log('wallet', 'coin-home.page createConsolidateTransaction');
        // const transfer = new Transfer();
        // Object.assign(transfer, {
        //     masterWalletId: this.masterWallet.id,
        //     elastosChainCode: this.elastosChainCode,
        //     rawTransaction: rawTx,
        //     payPassword: '',
        //     action: null,
        //     intentId: null,
        // });

        // await this.subWallet.signAndSendRawTransaction(rawTx, transfer);
    }

    countAsDailyTransactionIfNeeded(timestamp: number) {
        const today = moment(new Date());
        if (today.startOf('day').isSame(moment(timestamp).startOf('day'))) {
            this.todaysTransactions++;
        }
    }

    /** Returns the currency to be displayed for this coin. */
    getCoinBalanceCurrency() {
        return this.subWallet.getDisplayTokenName();
    }

    getSubwalletClass() {
        switch (this.subWallet.id) {
            case 'ELA':
                return 'black-card card-row';
            case 'IDChain':
                return 'blue-card card-row';
            case 'ETHSC':
                return 'gray-card card-row';
        }
        if (this.subWallet instanceof ERC20SubWallet) {
            return 'gray2-card card-row';
        }

        return 'black-card card-row';
    }

    getSubwalletTitle() {
        return this.subWallet.getFriendlyName();
    }

    coinCanBeTransferred() {
        return this.subWallet.supportsCrossChainTransfers();
    }

    /**
     * Whether the active subwallet can display currency amounts or not. For example for now,
     * we are not able to display USD value for ERC20 tokens.
     */
    canDisplayCurrency(): boolean {
        return !(this.subWallet instanceof ERC20SubWallet);
    }

    closeRefreshBox() {
        this.uiService.returnedUser = true;
        void this.storage.setVisit(true);
    }
}
