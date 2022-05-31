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
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { NFT, NFTType } from 'src/app/wallet/model/networks/evms/nfts/nft';
import { NFTAsset, NFTAssetAttribute } from 'src/app/wallet/model/networks/evms/nfts/nftasset';
import { CoinTransferService, TransferType } from 'src/app/wallet/services/cointransfer.service';
import { ERC721Service } from 'src/app/wallet/services/evm/erc721.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { LocalStorage } from '../../../../services/storage.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-nft-details',
    templateUrl: './coin-nft-details.page.html',
    styleUrls: ['./coin-nft-details.page.scss'],
})
export class CoinNFTDetailsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: AnyNetworkWallet = null;
    public nft: NFT = null;
    public asset: NFTAsset = null;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        public native: Native,
        public events: Events,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private erc721service: ERC721Service,
        private coinTransferService: CoinTransferService,
        public uiService: UiService,
        private storage: LocalStorage
    ) {
        this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.nft-overview"));
    }

    ionViewDidLeave() {
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            //console.log("NAVSTATE", navigation.extras.state)
            // Retrieve the master wallet
            let masterWalletId = navigation.extras.state.masterWalletId;
            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);

            // Retrieve the NFT
            let nftContractAddress = navigation.extras.state.nftContractAddress;
            this.nft = this.networkWallet.getNFTByAddress(nftContractAddress);

            // Retrieve the NFT asset
            let assetID = navigation.extras.state.assetID;
            this.asset = this.nft.getAssetById(assetID);

            Logger.log("wallet", "Initialization complete for NFT details", this.networkWallet, this.nft, this.asset);
        }
    }

    ngOnInit() {
    }

    public getDisplayableAssetName(): string {
        return this.asset.name || this.translate.instant("wallet.nft-unnamed-asset");
    }

    public getDisplayableAssetID(): string {
        if (this.asset.displayableId.length < 20)
            return this.asset.displayableId;

        return this.asset.displayableId.substr(0, 20) + "...";
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

    public getAttributeValue(attribute: NFTAssetAttribute): string {
        switch (attribute.display_type) {
            case "date": return moment.unix(<number>attribute.value).format("YYYY-MM-DD");
            default: return `${attribute.value}`;
        }
    }

    /**
     * For now, only handle transfers of ERC721 NFTs
     */
    public canSendReceive(): boolean {
        return this.nft && (this.nft.type === NFTType.ERC721 || this.nft.type === NFTType.ERC1155);
    }

    public sendNFT() {
        if (!this.nft || !this.asset)
            return;

        this.coinTransferService.masterWalletId = this.networkWallet.masterWallet.id;
        this.coinTransferService.subWalletId = this.networkWallet.getMainEvmSubWallet().id;
        this.coinTransferService.transferType = TransferType.SEND_NFT;
        this.coinTransferService.nftTransfer = {
            nft: this.nft,
            assetID: this.asset.id
        }
        this.native.go('/wallet/coin-transfer');
    }

    /**
     * Opens the screen that shows user's address and qr code to receive more NFTs.
     */
    public receiveNFT() {
        this.coinTransferService.masterWalletId = this.networkWallet.masterWallet.id;
        this.coinTransferService.subWalletId = this.networkWallet.getMainEvmSubWallet().id;
        this.native.go('/wallet/coin-receive');
    }
}
