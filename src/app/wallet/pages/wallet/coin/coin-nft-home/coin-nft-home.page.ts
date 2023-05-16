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
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { NFT } from 'src/app/wallet/model/networks/evms/nfts/nft';
import { NFTAsset } from 'src/app/wallet/model/networks/evms/nfts/nftasset';
import { ERC721Service } from 'src/app/wallet/services/evm/erc721.service';
import { Config } from '../../../../config/Config';
import { CoinType } from '../../../../model/coin';
import { TransactionInfo } from '../../../../model/tx-providers/transaction.types';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-nft-home',
    templateUrl: './coin-nft-home.page.html',
    styleUrls: ['./coin-nft-home.page.scss'],
})
export class CoinNFTHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    //public masterWalletInfo = '';
    public networkWallet: AnyNetworkWallet = null;
    public nft: NFT = null;
    public assets: NFTAsset[] = [];
    //public subWallet: SubWallet = null;
    //public subWalletId: StandardCoinName = null;
    public transferList: TransactionInfo[] = [];
    public transactionsLoaded = false;

    // Total transactions today
    public todaysTransactions = 0;
    private MaxCount = 0;
    private pageNo = 0;
    private start = 0;

    // Helpers
    public SELA = Config.SELA;
    public CoinType = CoinType;

    public isShowMore = false;
    public refreshingAssets = false;

    private updateInterval = null;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        private coinTransferService: CoinTransferService,
        public native: Native,
        public events: GlobalEvents,
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
        this.titleBar.setTitle(this.translate.instant("wallet.nft-overview"));
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
            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);

            // Retrieve the NFT
            let nftContractAddress = navigation.extras.state.contractAddress;
            this.nft = this.networkWallet.getNFTByAddress(nftContractAddress);

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

    refreshAssets() {
        this.refreshingAssets = true;
        this.networkWallet.refreshNFTAssets(this.nft).subscribe({
            next: (assets) => {
                this.assets = this.nft.getAssets();
            },
            complete: () => {
                this.refreshingAssets = false;
            }
        });
    }

    public getDisplayableAssetName(asset: NFTAsset): string {
        return asset.name || this.translate.instant("wallet.nft-unnamed-asset");
    }

    public getDisplayableAssetDescription(asset: NFTAsset): string {
        if (!asset.description)
            return "";

        if (asset.description.length > 200)
            return asset.description.substr(0, 200) + "...";
        else
            return asset.description;
    }

    public getDisplayableAssetID(asset: NFTAsset): string {
        if (asset.displayableId.length < 15)
            return asset.displayableId;

        return asset.displayableId.substr(0, 15) + "...";
    }

    public hasRealAssetIcon(asset: NFTAsset): boolean {
        return !!(asset.imageURL);
    }

    public getAssetIcon(asset: NFTAsset): string {
        if (this.hasRealAssetIcon(asset))
            return asset.imageURL;
        else
            return "assets/wallet/tx/ethereum.svg";
    }

    receiveNFT() {
        this.native.go('/wallet/coin-receive');
    }

    /**
     * Opens the NFT asset details screen
     */
    showAssetDetails(asset: NFTAsset) {
        console.log("coin home", this.nft, this.networkWallet.nfts, asset)

        this.native.go('/wallet/coin-nft-details', {
            masterWalletId: this.networkWallet.id,
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

    async doRefresh(event): Promise<void> {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            await this.storage.setVisit(true);
        }

        await this.initData();
        // TODO - FORCE REFRESH ALL COINS BALANCES ? this.currencyService.fetch();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    getIndexByTxId(txid: string) {
        return this.transferList.findIndex(e => e.txid === txid);
    }

    countAsDailyTransactionIfNeeded(timestamp: number) {
        const today = moment(new Date());
        if (today.startOf('day').isSame(moment(timestamp).startOf('day'))) {
            this.todaysTransactions++;
        }
    }

    async closeRefreshBox(): Promise<void> {
        this.uiService.returnedUser = true;
        await this.storage.setVisit(true);
    }
}
