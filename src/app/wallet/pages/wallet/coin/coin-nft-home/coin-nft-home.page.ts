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

import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Config } from '../../../../config/Config';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { Util } from '../../../../model/Util';
import { WalletManager } from '../../../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { CoinTransferService, TransferType } from '../../../../services/cointransfer.service';
import { StandardCoinName, CoinType } from '../../../../model/Coin';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import { TransactionInfo } from '../../../../model/Transaction';
import * as moment from 'moment';
import { CurrencyService } from '../../../../services/currency.service';
import { ERC20SubWallet } from '../../../../model/wallets/ERC20SubWallet';
import { StandardSubWallet } from '../../../../model/wallets/StandardSubWallet';
import { UiService } from '../../../../services/ui.service';
import { LocalStorage } from '../../../../services/storage.service';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { NFT, NFTType } from 'src/app/wallet/model/nft';
import { ERC721Service } from 'src/app/wallet/services/erc721.service';
import { NFTAsset } from 'src/app/wallet/model/nftasset';

@Component({
    selector: 'app-coin-nft-home',
    templateUrl: './coin-nft-home.page.html',
    styleUrls: ['./coin-nft-home.page.scss'],
})
export class CoinNFTHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    //public masterWalletInfo = '';
    public masterWallet: MasterWallet = null;
    public nft: NFT = null;
    //public subWallet: SubWallet = null;
    //public elastosChainCode: StandardCoinName = null;
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
    public refreshingAssets = false;

    private updateInterval = null;

    constructor(
        public router: Router,
        public walletManager: WalletManager,
        public translate: TranslateService,
        private coinTransferService: CoinTransferService,
        public native: Native,
        public events: Events,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private erc721service: ERC721Service,
        public uiService: UiService,
        private storage: LocalStorage,
        private zone: NgZone
    ) {
        void this.init();
    }

    ionViewWillEnter() {
        //this.startUpdateInterval();
        this.titleBar.setTitle("NFT Overview");
    }

    ionViewDidLeave() {
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }
    }

    async init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            Logger.log("wallet", "Initializing NFT home with navigation params:", navigation.extras.state);

            // Retrieve the master wallet
            let masterWalletId = navigation.extras.state.masterWalletId;
            this.masterWallet = this.walletManager.getMasterWallet(masterWalletId);

            // Retrieve the NFT
            let nftContractAddress = navigation.extras.state.contractAddress;
            this.nft = this.masterWallet.getNFTByAddress(nftContractAddress);

            await this.initData();
        }
    }

    ngOnInit() {
    }

    async initData() {
        if (!this.nft) {
            Logger.warn("wallet", "No NFT. This screen was maybe open with an unknown NFT contract address / not added to the wallet");
            return;
        }

        this.pageNo = 0;
        this.start = 0;
        this.MaxCount = 0;
        this.transferList = [];
        this.todaysTransactions = 0;
        // TODO this.getAllTx();

        await this.refreshAssets();
    }

    startUpdateInterval() {
      if (this.updateInterval === null) {
        this.updateInterval = setInterval(() => {
          void this.initData();
        }, 30000);// 30s
      }
    }

    restartUpdateInterval() {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.startUpdateInterval();
    }

    async refreshAssets() {
        this.refreshingAssets = true;
        await this.masterWallet.refreshNFTAssets(this.nft);
        this.refreshingAssets = false;
    }

    public getDisplayableAssetName(asset: NFTAsset): string {
        return asset.name || "Unnamed Asset";
    }

    public getDisplayableAssetID(asset: NFTAsset): string {
        if (asset.id.length < 15)
            return asset.id;

        return asset.id.substr(0, 15)+"...";
    }

    public hasRealAssetIcon(asset: NFTAsset): boolean {
        return !!(asset.imageURL);
    }

    public getAssetIcon(asset: NFTAsset): string {
        if (this.hasRealAssetIcon(asset))
            return asset.imageURL;
        else
            return "assets/wallet/coins/eth-purple.svg";
    }

    /* async getAllTx() {
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
                continue;
            }

            if (this.chainIsETHSC() || this.chainIsERC20()) {
                transactionInfo.amount = transactionInfo.amount.isInteger() ? transactionInfo.amount.integerValue() : transactionInfo.amount;
            }

            // Check if transaction was made today and increment our counter if so.
            this.countAsDailyTransactionIfNeeded(transactionInfo.timestamp);

            this.transferList.push(transactionInfo);
        }
    } */

    /* onItem(item) {
        this.native.go(
            '/wallet/coin-tx-info',
            {
                masterWalletId: this.masterWallet.id,
                elastosChainCode: this.elastosChainCode,
                transactionInfo: item
            }
        );
    } */

    receiveNFT() {
        this.native.go('/wallet/coin-receive');
    }

    /**
     * Opens the NFT asset details screen
     */
    showAssetDetails(asset: NFTAsset) {
        this.native.go('/wallet/coin-nft-details', {
            masterWalletId: this.masterWallet.id,
            nftContractAddress: this.nft.contractAddress,
            assetID: asset.id
        });
    }

    /* sendNFT() {
        this.coinTransferService.transferType = TransferType.SEND;
        this.native.go('/wallet/coin-transfer');
    }

    transferFunds() {
        if (this.chainIsELA()) {
            this.rechargeFunds();
        } else {
            this.withdrawFunds();
        }
    } */

    /* clickMore() {
        this.restartUpdateInterval();
        this.pageNo++;
        this.start = this.pageNo * 20;
        if (this.start >= this.MaxCount) {
            this.isShowMore = false;
            return;
        }
        this.isShowMore = true;
        this.getAllTx();
    } */

    doRefresh(event) {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            this.storage.setVisit(true);
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

   /*  async checkUTXOCount() {
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
    } */

    countAsDailyTransactionIfNeeded(timestamp: number) {
        const today = moment(new Date());
        if (today.startOf('day').isSame(moment(timestamp).startOf('day'))) {
            this.todaysTransactions++;
        }
    }

    /* getSubwalletClass() {
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
    }*/

    /**
     * Whether the active subwallet can display currency amounts or not. For example for now,
     * we are not able to display USD value for ERC20 tokens.
     */
    /*canDisplayCurrency(): boolean {
        return !(this.subWallet instanceof ERC20SubWallet);
    } */

    closeRefreshBox() {
        this.uiService.returnedUser = true;
        this.storage.setVisit(true);
    }
}
