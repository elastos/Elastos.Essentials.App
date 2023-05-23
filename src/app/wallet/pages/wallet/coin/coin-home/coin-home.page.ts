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
import { Platform, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { UIToken } from 'src/app/multiswap/model/uitoken';
import { MultiSwapHomePageParams } from 'src/app/multiswap/pages/home/home';
import { ChaingeSwapService } from 'src/app/multiswap/services/chaingeswap.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DposStatus, VoteService } from 'src/app/voting/services/vote.service';
import { StakingInitService } from 'src/app/voting/staking/services/init.service';
import { WarningComponent } from 'src/app/wallet/components/warning/warning.component';
import { ExtendedTransactionInfo } from 'src/app/wallet/model/extendedtxinfo';
import { WalletCreator } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { EthContractEvent } from 'src/app/wallet/model/networks/evms/ethtransactioninfoparser';
import { TransactionListType } from 'src/app/wallet/model/networks/evms/evm.types';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { TRC20SubWallet } from 'src/app/wallet/model/networks/tron/subwallets/trc20.subwallet';
import { TronSubWallet } from 'src/app/wallet/model/networks/tron/subwallets/tron.subwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Config } from '../../../../config/Config';
import { CoinType, StandardCoinName } from '../../../../model/coin';
import { AnySubWallet } from '../../../../model/networks/base/subwallets/subwallet';
import { AnyOfflineTransaction, GenericTransaction, OfflineTransactionType, TransactionInfo } from '../../../../model/tx-providers/transaction.types';
import { CoinTransferService, TransferType } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { LocalStorage } from '../../../../services/storage.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';
import { CoinTxInfoParams } from '../coin-tx-info/coin-tx-info.page';

@Component({
    selector: 'app-coin-home',
    templateUrl: './coin-home.page.html',
    styleUrls: ['./coin-home.page.scss'],
})
export class CoinHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('fetchmoretrigger', { static: true }) fetchMoreTrigger: ElementRef;

    public masterWalletInfo = '';
    public networkWallet: AnyNetworkWallet = null;
    public subWallet: AnySubWallet = null;
    public subWalletId: StandardCoinName = null;
    public transferList: TransactionInfo[] = [];
    public extendedTxInfo: { [txHash: string]: ExtendedTransactionInfo } = {};
    public offlineTransactions: AnyOfflineTransaction[] = [];
    public transactionsLoaded = false;
    private transactions: GenericTransaction[] = []; // raw transactions received from the providers / cache

    public transactionListType = TransactionListType.NORMAL;
    public hasInternalTransactions = false;

    public stakedBalance = null; // Staked on ELA main chain or Tron

    // Total transactions today
    public todaysTransactions = 0;
    // Only for fetchMoreTransactions
    private prevTransactionCount = 0;
    //private MaxCount = 0;
    private start = 0;

    // Helpers
    public WalletUtil = WalletUtil;
    public SELA = Config.SELA;
    public CoinType = CoinType;

    public canFetchMore = true;
    public shouldShowLoadingSpinner = false;
    public shouldShowAllActions: boolean = null;
    // Observer that detects when the "fetch more trigger" UI item crosses the ion-content, which means we
    // are at the bottom of the list.
    private fetchMoreTriggerObserver: IntersectionObserver;

    private transactionListChangedSubscription: Subscription = null;
    private transactionFetchStatusChangedSubscription: Subscription = null;
    private extendedInfoChangeSubscription: Subscription = null;

    private updateInterval = null;
    private updateTmeout = null;
    private updateTransactionsTimesamp = 0;

    public popover: any = null;

    private isIOS = false;
    private canBrowseInApp = false;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        private coinTransferService: CoinTransferService,
        public native: Native,
        public events: GlobalEvents,
        private zone: NgZone,
        public popupProvider: PopupProvider,
        private popoverCtrl: PopoverController,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        public uiService: UiService,
        private storage: LocalStorage,
        private globalStorage: GlobalStorageService,
        private globalNav: GlobalNavService,
        private didSessions: GlobalDIDSessionsService,
        private chaingeSwapService: ChaingeSwapService,
        private dAppBrowserService: DappBrowserService,
        private platform: Platform,
        public stakingInitService: StakingInitService,
        private voteService: VoteService
    ) {
        void this.init();
    }

    ngOnDestroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.updateTmeout) {
            clearTimeout(this.updateTmeout);
            this.updateTmeout = null;
        }
        if (this.transactionListChangedSubscription) {
            this.transactionListChangedSubscription.unsubscribe();
            this.transactionListChangedSubscription = null;
        }
        if (this.transactionFetchStatusChangedSubscription) {
            this.transactionFetchStatusChangedSubscription.unsubscribe();
            this.transactionFetchStatusChangedSubscription = null;
        }
        if (this.extendedInfoChangeSubscription) {
            this.extendedInfoChangeSubscription.unsubscribe();
            this.extendedInfoChangeSubscription = null;
        }
        if (this.fetchMoreTriggerObserver) {
            this.fetchMoreTriggerObserver.disconnect();
            this.fetchMoreTriggerObserver = null;
        }
    }

    ngAfterViewInit() {
        const options: IntersectionObserverInit = {
            root: this.fetchMoreTrigger.nativeElement.closest('.intersection-container')
        };
        this.fetchMoreTriggerObserver = new IntersectionObserver((data: IntersectionObserverEntry[]): IntersectionObserverCallback => {
            if (data[0].isIntersecting) {
                this.fetchMoreTransactions();
                return;
            }
        }, options);
        this.fetchMoreTriggerObserver.observe(this.fetchMoreTrigger.nativeElement);
    }

    ionViewWillEnter() {
        this.coinTransferService.subWalletId = this.subWalletId;
        this.titleBar.setTitle(this.translate.instant('wallet.coin-transactions'));

        void this.loadShowAllActions();
    }

    // Cannot be async
    async init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            let masterWalletId = navigation.extras.state.masterWalletId;
            this.subWalletId = navigation.extras.state.subWalletId as StandardCoinName;

            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);
            if (!this.networkWallet) {
                Logger.warn('wallet', 'coin-home error this.networkWallet = null,', masterWalletId)
            }
            this.coinTransferService.reset();
            this.coinTransferService.masterWalletId = masterWalletId;
            this.coinTransferService.subWalletId = this.subWalletId;

            this.subWallet = this.networkWallet.getSubWallet(this.subWalletId);

            void this.getStakedBalance();

            this.startUpdateInterval();
        }

        void this.initData(true);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.transactionListChangedSubscription = this.subWallet.transactionsListChanged().subscribe((value) => {
            if (value === null)
                return; // null is the initial value.

            this.updateTransactionsTimesamp = 0;
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

        this.extendedInfoChangeSubscription = this.networkWallet.extendedTransactionInfoUpdated.subscribe(info => {
            void this.zone.run(() => {
                this.extendedTxInfo[info.txHash] = info.extInfo;
            });
        });

        this.isIOS = this.platform.platforms().indexOf('android') < 0;
        // Disable swap on iOS as apple complains about swap.
        // if (this.isIOS) {
        //     this.canBrowseInApp = await this.dAppBrowserService.canBrowseInApp();
        // }
    }

    ngOnInit() {
    }

    async initData(updateAll = false) {
        // Initial transactions from cache.
        await this.updateTransactions();
        this.updateTransactionsTimesamp = 0; // Force to update transactions after fetch new transactions.

        this.shouldShowLoadingSpinner = true;
        if (updateAll) {
            // Must one by one.
            await this.subWallet.fetchNewestTransactions(TransactionListType.NORMAL),
            await this.subWallet.fetchNewestTransactions(TransactionListType.INTERNAL)
        } else {
            void this.subWallet.fetchNewestTransactions(this.transactionListType);
        }
    }

    async updateTransactions() {
        // Avoid updating transactions too frequently.
        let currentTimesamp = moment().valueOf();
        if (currentTimesamp < this.updateTransactionsTimesamp + 10000) {
            return;
        }
        this.updateTransactionsTimesamp = currentTimesamp;
        this.start = 0;
        this.offlineTransactions = [];
        this.todaysTransactions = 0;
        await this.getOfflineTransactions();
        await this.getAllTx();
        await this.checkInternalTransactions();
    }

    async updateWalletInfo() {
        // Update balance and get the latest transactions.
        await this.subWallet.update();
        await this.getStakedBalance();
        void this.initData();
    }

    async checkInternalTransactions() {
        if (!this.hasInternalTransactions) {
            let transactions = await this.subWallet.getTransactions(TransactionListType.INTERNAL);
            if (transactions && transactions.length > 0) {
                Logger.log('wallet', 'find internal transactions.')
                this.zone.run(() => {
                    this.hasInternalTransactions = true;
                })
            }
        }
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
        return this.subWalletId === StandardCoinName.ELA;
    }

    chainIsETHSC(): boolean {
        return this.subWalletId === StandardCoinName.ETHSC;
    }

    chainIsERC20(): boolean {
        return (this.subWallet instanceof ERC20SubWallet) || (this.subWallet instanceof TRC20SubWallet);
    }

    private async getOfflineTransactions() {
        this.offlineTransactions = await this.subWallet.getOfflineTransactions() || [];
    }

    async getAllTx() {
        let transactions = await this.subWallet.getTransactions(this.transactionListType);
        if (!transactions) {
            Logger.log('wallet', "Can not get transaction");
            this.canFetchMore = false;
            return;
        }
        Logger.log('wallet', "Got all transactions: ", transactions.length, this.subWallet.masterWallet.name);

        if (this.subWallet.canFetchMoreTransactions()) {
            this.canFetchMore = true;
        }
        else {
            this.canFetchMore = false;
        }

        /* TODO - "can fetch more" to be called on the subwalelt -> transactions provider if (this.MaxCount <= 20) {
            this.canShowMore = false;
        } */

        const today = moment(new Date()).startOf('day');
        let transferListTemp: TransactionInfo[] = [];
        for (let transaction of transactions) {
            const transactionInfo = await this.subWallet.getTransactionInfo(transaction);
            if (!transactionInfo) {
                Logger.log('wallet', 'Invalid transaction or transaction that need to be hidden!');
                continue;
            }

            if (this.chainIsETHSC() || this.chainIsERC20()) {
                transactionInfo.amount = transactionInfo.amount.isInteger() ? transactionInfo.amount.integerValue() : transactionInfo.amount;
            }

            // Check if transaction was made today and increment our counter if so.
            this.countAsDailyTransactionIfNeeded(today, transactionInfo.timestamp);

            transferListTemp.push(transactionInfo);

            let extTxInfo = await this.networkWallet.getExtendedTxInfo(transactionInfo.txid);
            this.extendedTxInfo[transactionInfo.txid] = extTxInfo;
        }

        this.transferList = transferListTemp;
        this.transactionsLoaded = true;

        //At least all transactions of today must be loaded.
        if ((this.todaysTransactions == transactions.length) && (this.prevTransactionCount != transactions.length)) {
            this.fetchMoreTransactions();
        }

        this.prevTransactionCount = transactions.length;
    }

    public onItem(item) {
        let params: CoinTxInfoParams = {
            masterWalletId: this.networkWallet.id,
            subWalletId: this.subWalletId,
            transactionInfo: item
        };
        this.native.go('/wallet/coin-tx-info', params);
    }

    /**
     * Offline transaction item was clicked
     */
    public onOfflineTransactionItem(item: AnyOfflineTransaction) {
        switch (item.type) {
            case OfflineTransactionType.MULTI_SIG_STANDARD:
                let params: CoinTxInfoParams = {
                    masterWalletId: this.networkWallet.id,
                    subWalletId: this.subWalletId,
                    offlineTransaction: item
                };
                this.native.go("/wallet/coin-tx-info", params);
                break;
            default:
            // Nothing
        }
    }

    async receiveFunds() {
        if (this.networkWallet.masterWallet.creator === WalletCreator.WALLET_APP) {
            const needsBackup = !(await this.didSessions.activeIdentityWasBackedUp());
            if (needsBackup) {
                await this.showBackupPrompt()
            } else {
                this.native.go('/wallet/coin-receive');
            }
        } else {
            this.native.go('/wallet/coin-receive');
        }
    }

    async showBackupPrompt() {
        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-warning-component',
            component: WarningComponent,
            componentProps: {
                title: this.translate.instant('launcher.backup-title'),
                message: this.translate.instant('launcher.backup-message')
            },
            translucent: false
        });

        this.popover.onWillDismiss().then((params) => {
            this.popover = null;

            if (params && params.data && params.data.confirm) {
                void this.globalNav.navigateTo("identitybackup", "/identity/backupdid");
            } else {
                this.native.go('/wallet/coin-receive');
            }
        });

        return await this.popover.present();
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

        void this.updateWalletInfo();
        // TODO - FORCE REFRESH ALL COINS BALANCES ? this.currencyService.fetch();
        setTimeout(() => {
            event.target.complete();
        }, 500);
    }

    getIndexByTxId(txid: string) {
        return this.transferList.findIndex(e => e.txid === txid);
    }

    countAsDailyTransactionIfNeeded(today: moment.Moment, timestamp: number) {
        if (today.isSame(moment(timestamp).startOf('day'))) {
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

    // For FRC759 token on fusion network, We can only transfer parent token.
    coinCanBeSent() {
        return !((this.networkWallet.network.key === 'fusion')
            && (this.subWallet instanceof ERC20SubWallet)
            && ((this.subWallet as ERC20SubWallet).hasParentWallet))
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

    public useSmallFont(): boolean {
        return WalletUtil.getWholeBalance(this.networkWallet.subWallets[this.subWalletId].getDisplayBalance()).length >= 10;
    }

    public setTransactionListType(transactionlistType: TransactionListType) {
        this.transactionListType = transactionlistType;
        this.updateTransactionsTimesamp = 0;
        void this.initData(false);
    }

    public earn(subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        //event.preventDefault();
        //event.stopPropagation();

        this.native.go("/wallet/coin-earn", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        });
    }

    public swap(subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        //event.preventDefault();
        //event.stopPropagation();

        /* this.native.go("/wallet/coin-swap", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        }); */

        let targetToken: UIToken = {
            token: this.subWallet.getCoin(),
            amount: this.subWallet.getBalance()
        }

        // If there is a balance, use this token as source token for the swap (UI convenience).
        // If balance is 0, use it as destination (assume user wants to receive that token because he has none).
        let selectTokenAsSource = targetToken.amount.gt(0);
        let params: MultiSwapHomePageParams = {
            sourceToken: selectTokenAsSource ? targetToken : undefined,
            destinationToken: !selectTokenAsSource ? targetToken : undefined,
        };

        void this.globalNav.navigateTo(App.MULTI_SWAP, "/multiswap/home", {
            state: params
        });
    }

    /* public bridge(subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        //event.preventDefault();
        //event.stopPropagation();

        this.native.go("/wallet/coin-bridge", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        });
    } */

    /**
     * Returns the ion-col size for the transfer/send/receive row, based on the available features.
     */
    public transfersColumnSize(): number {
        if (this.coinCanBeTransferred())
            return 4; // 3 columns - 3x4 = 12
        else
            return 6; // 2 columns - 2x6 = 12
    }

    public swapsColumnSize(): number {
        let item = 0;
        if (this.canSwap()) item++;
        if (this.canEarn()) item++;
        if (this.canStakeELA()) item++;
        if (this.canStakeTRX()) item++;

        switch (item) {
            case 1:
                return 12; // 1 columns
            case 2:
                return 6; // 2 columns - 2x6 = 12
            default:
                return 4; // 3 columns - 3x4 = 12
        }
    }

    /**
     * Tells if this subwallet can do one of earn, swap or bridge operations
     */
    public canEarnSwapOrBridge(): boolean {
        return this.canEarn() || this.canSwap() || this.canStakeELA()  || this.canStakeTRX()/* || this.canBridge() */;
    }

    public canEarn(): boolean {
        return this.subWallet.getAvailableEarnProviders().length > 0;
    }

    public canSwap(): boolean {
        if (this.isIOS && !this.canBrowseInApp) {
            return false;
        }
        return this.chaingeSwapService.isNetworkSupported(this.networkWallet.network);
    }

    public canStakeELA(): boolean {
        let status = this.voteService.dPoSStatus.value;
        if ((status == DposStatus.DPoSV2) || (status == DposStatus.DPoSV1V2)) {
            return WalletNetworkService.instance.isActiveNetworkElastosMainchain();
        } else {
            return false;
        }
    }

    public canStakeTRX(): boolean {
        return this.subWallet instanceof TronSubWallet;
    }

    // Deprecated
    /* public canBridge(): boolean {
        return false;
        //return this.subWallet.getAvailableBridgeProviders().length > 0;
    } */

    /**
     * Toggles and saves whether we should show more or less actions for the user in the footer.
     */
    public async toggleShowAllActions(): Promise<void> {
        this.shouldShowAllActions = !this.shouldShowAllActions;
        await await this.globalStorage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "coinhome-show-all-actions", this.shouldShowAllActions);
    }

    public async loadShowAllActions(): Promise<void> {
        this.shouldShowAllActions = await this.globalStorage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "coinhome-show-all-actions", true);
    }

    /**
     * Whether the arrow to toggle show/hide all actions should be shown or
     * hidden (in case there is nothing to toggle).
     */
    public shouldShowAllActionsToggle(): boolean {
        // Wait for shouldShowAllActions to be loaded (not null)
        return this.canEarnSwapOrBridge() && this.shouldShowAllActions !== null;
    }

    public getActionToggleIcon(): string {
        if (this.shouldShowAllActions) {
            if (this.theme.darkMode)
                return 'assets/wallet/icons/white-down-arrow-large.svg';
            else
                return 'assets/wallet/icons/black-down-arrow-large.svg';
        }
        else {
            if (this.theme.darkMode)
                return 'assets/wallet/icons/white-up-arrow-large.svg';
            else
                return 'assets/wallet/icons/black-up-arrow-large.svg';
        }
    }

    /**
     * Displayable list item title for offline transactions
     */
    public getOfflineTransactionTitle(offlineTx: AnyOfflineTransaction): string {
        switch (offlineTx.type) {
            case OfflineTransactionType.MULTI_SIG_STANDARD: return this.translate.instant('wallet.offline-tx-pending-multisig');
            default: this.translate.instant('wallet.offline-tx-unknown-tx');
        }
    }

    public getOfflineTransactionDate(offlineTx: AnyOfflineTransaction): string {
        return WalletUtil.getDisplayDate(offlineTx.updated);
    }

    public getPayStatusIcon(transfer: TransactionInfo): string {
        return transfer.payStatusIcon;
    }

    public getTransactionTitle(transfer: TransactionInfo): string {
        /* // If we have a good extended info, use it. Otherwise, use the base transaction info 'name'
        let extTxInfo = this.extendedTxInfo[transfer.txid];
        if (extTxInfo && extTxInfo.evm && extTxInfo.evm.txInfo && extTxInfo.evm.txInfo.operation && extTxInfo.evm.txInfo.operation.description)
            return this.translate.instant(extTxInfo.evm.txInfo.operation.description, extTxInfo.evm.txInfo.operation.descriptionTranslationParams);
 */
        if (transfer && transfer.name)
            return this.translate.instant(transfer.name);
    }

    public getContractEvents(transfer: TransactionInfo): EthContractEvent[] {
        let extTxInfo = this.extendedTxInfo[transfer.txid];

        if (!extTxInfo || !extTxInfo.evm || !extTxInfo.evm.txInfo)
            return [];

        return extTxInfo.evm.txInfo.events;
    }

    public getStakeTitle() {
        if (this.networkWallet) {
            if (this.networkWallet.network.key === 'tron') {
                return 'wallet.resource-freeze-balance';
            }
        }
        return 'staking.staked';
    }

    public async getStakedBalance() {
        // Can't use WalletNetworkService.instance.isActiveNetworkElastosMainchain()
        // We got the activeNetworkWallet event first, but the WalletNetworkService.instance.isActiveNetworkElastosMainchain still return true.
        if (this.networkWallet) {
            if (this.networkWallet.network.key === 'elastos') {
                if (this.subWallet instanceof MainChainSubWallet) {
                    this.stakedBalance = await this.subWallet.getStakedBalance();
                }
            } else if (this.networkWallet.network.key === 'tron') {
                if (this.subWallet instanceof TronSubWallet) {
                    this.stakedBalance = await this.subWallet.getFrozenBalance();
                }
            }
        }
    }

    public getStakedBalanceInNative() {
        return WalletUtil.getFriendlyBalance(new BigNumber(this.stakedBalance));
    }

    public getStakedBalanceInCurrency() {
        let balance = CurrencyService.instance.getMainTokenValue(new BigNumber(this.stakedBalance),
            this.networkWallet.network, this.currencyService.selectedCurrency.symbol);
        return WalletUtil.getFriendlyBalance(balance);
    }

    public goStakeApp(s) {
        this.stakingInitService.start()
    }

    public goTronResource(s) {
        this.native.go('wallet-tron-resource');
    }
}
