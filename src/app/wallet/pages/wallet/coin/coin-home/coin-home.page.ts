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

import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Config } from '../../../../config/Config';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { Util } from '../../../../model/util';
import { WalletService } from '../../../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { MasterWallet } from '../../../../model/wallets/masterwallet';
import { CoinTransferService, TransferType } from '../../../../services/cointransfer.service';
import { StandardCoinName, CoinType } from '../../../../model/coin';
import { SubWallet } from '../../../../model/wallets/subwallet';
import { TransactionInfo } from '../../../../model/transaction.types';
import * as moment from 'moment';
import { CurrencyService } from '../../../../services/currency.service';
import { ERC20SubWallet } from '../../../../model/wallets/erc20.subwallet';
import { StandardSubWallet } from '../../../../model/wallets/standard.subwallet';
import { UiService } from '../../../../services/ui.service';
import { LocalStorage } from '../../../../services/storage.service';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';

@Component({
    selector: 'app-coin-home',
    templateUrl: './coin-home.page.html',
    styleUrls: ['./coin-home.page.scss'],
})
export class CoinHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWalletInfo = '';
    public networkWallet: NetworkWallet = null;
    public subWallet: SubWallet = null;
    public elastosChainCode: StandardCoinName = null;
    public transferList: TransactionInfo[] = [];
    public transactionsLoaded = false;

    // Total transactions today
    public todaysTransactions = 0;
    private MaxCount = 0;
    private pageNo = 0;
    private start = 0;

    // Helpers
    public Util = Util;
    public SELA = Config.SELA;
    public CoinType = CoinType;

    public isShowMore = false;

    private syncSubscription: Subscription = null;
    private syncCompletedSubscription: Subscription = null;
    private transactionStatusSubscription: Subscription = null;

    private updateInterval = null;
    private updateTmeout = null;

    public loadingTX = false;
    private fromWalletHome = true;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        private coinTransferService: CoinTransferService,
        public native: Native,
        public events: Events,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        public uiService: UiService,
        private storage: LocalStorage
    ) {
        this.init();
    }

    ionViewWillEnter() {
        this.coinTransferService.elastosChainCode = this.elastosChainCode;
        this.titleBar.setTitle(this.elastosChainCode);
        void this.initData();
    }

    ionViewDidLeave() {
        this.fromWalletHome = false;
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
        if (this.transactionStatusSubscription) {
          this.transactionStatusSubscription.unsubscribe();
          this.transactionStatusSubscription = null;
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
            this.coinTransferService.walletInfo = this.native.clone(this.networkWallet.masterWallet.account);

            this.subWallet = this.networkWallet.getSubWallet(this.elastosChainCode);
        }
    }

    ngOnInit() {
    }

    initData() {
        if (!this.transactionStatusSubscription) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.transactionStatusSubscription = this.walletManager.subwalletTransactionStatus.get(this.subWallet.subwalletTransactionStatusID).subscribe(async (count) => {
              if (count >= 0) {
                await this.updateTransactions();
                this.loadingTX = false;
              }
          });
        }

        if (!this.updateTmeout) {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          this.updateTmeout = setTimeout(async () => {
            if (this.subWallet.isLoadTxDataFromCache()) {
              this.loadingTX = true;
              await this.updateWalletInfo();
            }
            this.startUpdateInterval();
          }, this.fromWalletHome ? 200 : 10000);
        }
    }

    async updateTransactions() {
        this.pageNo = 0;
        this.start = 0;
        this.MaxCount = 0;
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
          this.loadingTX = true;
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
        let allTransactions = await this.subWallet.getTransactions(this.start);
        if (!allTransactions) {
          Logger.log('wallet', "Can not get transaction");
          return;
        }
        this.transactionsLoaded = true;
        Logger.log('wallet', "Got all transactions: ", allTransactions);

        const transactions = allTransactions.txhistory;
        this.MaxCount = allTransactions.totalcount;

        if (this.start >= this.MaxCount) {
            this.isShowMore = false;
            return;
        } else {
            this.isShowMore = true;
        }
        if (!transactions) {
            this.isShowMore = false;
            return;
        }

        if (this.MaxCount <= 20) {
            this.isShowMore = false;
        }

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

    clickMore() {
        this.restartUpdateInterval();
        this.pageNo++;
        this.start = this.pageNo * 20;
        if (this.start >= this.MaxCount) {
            this.isShowMore = false;
            return;
        }
        this.isShowMore = true;
        void this.getAllTx();
    }

    async doRefresh(event): Promise<void> {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            await this.storage.setVisit(true);
        }

        this.initData();
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
        // Standard ELA coins can be transferred; ERC20 coins can't
        if (this.subWallet instanceof StandardSubWallet)
            return true;
        else
            return false;
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
