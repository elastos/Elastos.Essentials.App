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
    selector: 'app-coin-nft-details',
    templateUrl: './coin-nft-details.page.html',
    styleUrls: ['./coin-nft-details.page.scss'],
})
export class CoinNFTDetailsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet = null;
    public nft: NFT = null;
    public asset: NFTAsset = null;

    constructor(
        public router: Router,
        public walletManager: WalletManager,
        public translate: TranslateService,
        public native: Native,
        public events: Events,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private erc721service: ERC721Service,
        public uiService: UiService,
        private storage: LocalStorage
    ) {
        this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle("NFT Asset Overview");
    }

    ionViewDidLeave() {
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            console.log("NAVSTATE", navigation.extras.state)
            // Retrieve the master wallet
            let masterWalletId = navigation.extras.state.masterWalletId;
            this.masterWallet = this.walletManager.getMasterWallet(masterWalletId);

            // Retrieve the NFT
            let nftContractAddress = navigation.extras.state.nftContractAddress;
            this.nft = this.masterWallet.getNFTByAddress(nftContractAddress);

            // Retrieve the NFT asset
            let assetID = navigation.extras.state.assetID;
            this.asset = this.nft.getAssetById(assetID);

            Logger.log("wallet", "Initialization complete for NFT details", this.masterWallet, this.nft, this.asset);
        }
    }

    ngOnInit() {
    }

    public getDisplayableAssetName(): string {
        return this.asset.name || "Unnamed Asset";
    }

    public getDisplayableAssetID(): string {
        if (this.asset.id.length < 15)
            return this.asset.id;

        return this.asset.id.substr(0, 15)+"...";
    }

    public hasRealAssetIcon(): boolean {
        return !!(this.asset.imageURL);
    }

    public getAssetIcon(): string {
        if (this.hasRealAssetIcon())
            return this.asset.imageURL;
        else
            return "assets/wallet/coins/eth-purple.svg";
    }
}
