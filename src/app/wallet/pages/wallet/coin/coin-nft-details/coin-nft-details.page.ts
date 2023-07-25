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
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService, NodeType } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { ESCTransactionBuilder } from 'src/app/wallet/model/networks/elastos/evms/esc/tx-builders/esc.txbuilder';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { NFT, NFTType } from 'src/app/wallet/model/networks/evms/nfts/nft';
import { NFTAsset, NFTAssetAttribute } from 'src/app/wallet/model/networks/evms/nfts/nftasset';
import { CoinTransferService, Transfer, TransferType } from 'src/app/wallet/services/cointransfer.service';
import { ERC721Service } from 'src/app/wallet/services/evm/erc721.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
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
    public bposNFTInfos: {
      title: string,
      value: string
    }[] = [];

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        public native: Native,
        public events: GlobalEvents,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private erc721service: ERC721Service,
        private coinTransferService: CoinTransferService,
        public uiService: UiService,
        private storage: LocalStorage,
        private uxService: UXService,
        public globalPopupService: GlobalPopupService,
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
            if (this.asset.bPoSNFTInfo) {
                void this.prepareForBPoSNFTDisplay();
            }

            Logger.log("wallet", "Initialization complete for NFT details", this.networkWallet, this.nft, this.asset);
        }
    }

    ngOnInit() {
    }

    public getDisplayableAssetName(): string {
        return this.asset.name || this.translate.instant("wallet.nft-unnamed-asset");
    }

    public getDisplayableAssetID(): string {
        return this.asset.displayableId;

        /* if (this.asset.displayableId.length < 20)
            return this.asset.displayableId;

        return this.asset.displayableId.substr(0, 20) + "..."; */
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

    public async sendNFT() {
        if (!this.nft || !this.asset)
            return;

        this.coinTransferService.masterWalletId = this.networkWallet.masterWallet.id;
        this.coinTransferService.subWalletId = this.networkWallet.getMainEvmSubWallet().id;
        this.coinTransferService.transferType = TransferType.SEND_NFT;
        this.coinTransferService.nftTransfer = {
            nft: this.nft,
            assetID: this.asset.id,
            needApprove: this.asset.bPoSNFTInfo ? true : false, // approve for bpos nft
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

    public async destroyBPoSNFT() {
      Logger.log('wallet', 'destroyBPoSNFT', this);

      await this.native.showLoading(this.translate.instant('common.please-wait'));

      let mainEvmSubwallet = this.networkWallet.getMainEvmSubWallet();

      // get stake address
      let elaMainChainSubwallet = await this.getELAMainChainSubwallet();
      if (!elaMainChainSubwallet) {
          return this.native.toast('wallet.nft-no-ela-mainchain-wallet');
      }

      let stakeAddress = elaMainChainSubwallet.getOwnerStakeAddress();

      // approve
      let ret = await this.approveNFT();
      if (!ret) return;

      try {
          let escTxBuilder = new ESCTransactionBuilder(this.networkWallet);

          const rawTx = await escTxBuilder.burnBPoSNFT(this.asset.id, stakeAddress);
          await this.native.hideLoading();
          if (rawTx) {
              const transfer = new Transfer();
              Object.assign(transfer, {
                  masterWalletId: this.networkWallet.id,
                  subWalletId: mainEvmSubwallet.id,
                  payPassword: '',
                  action: null,
                  intentId: null,
              });
              await mainEvmSubwallet.signAndSendRawTransaction(rawTx, transfer);
          }
      }
      catch (e) {
          Logger.warn('wallet', 'destroyBPoSNFT exception:', e);
          await this.native.hideLoading();
          await this.globalPopupService.ionicAlert('wallet.transaction-fail', 'Unknown error, possibly a network issue');
      }
    }

    async getELAMainChainSubwallet() {
      let network = WalletNetworkService.instance.getNetworkByKey('elastos');
      let networkWallet = await network.createNetworkWallet(this.networkWallet.masterWallet, false);
      return networkWallet?.getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;
    }

    /**
     * Returns the ion-col size for the send/receive/destroy row, based on the available features.
     */
    public getColumnSize(): number {
      if (this.asset.bPoSNFTInfo)
          return 4; // 3 columns - 3x4 = 12
      else
          return 6; // 2 columns - 2x6 = 12
    }

    private async prepareForBPoSNFTDisplay() {
      this.bposNFTInfos = [];
      // votes
      this.bposNFTInfos.push({
        title: this.translate.instant('dposvoting.input-votes'),
        value: this.uxService.toThousands(Util.toELA(parseInt(this.asset.bPoSNFTInfo.votes))),
      })

      // voterights
      this.bposNFTInfos.push({
        title: this.translate.instant('voting.vote-rights'),
        value: this.uxService.toThousands(Util.toELA(parseInt(this.asset.bPoSNFTInfo.voteRights))),
      })

      // endHeight
      let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
      let currentBlockTimestamp = moment().valueOf() / 1000;
      let stakeTimestamp = (parseInt(this.asset.bPoSNFTInfo.endHeight) - currentHeight) * 720 + currentBlockTimestamp;

      this.bposNFTInfos.push({
        title: this.translate.instant('dposvoting.stake-until'),
        value: this.uxService.formatDate(stakeTimestamp),
      })

      // bpos node
      let targetNode = null;
      let targetOwnerKey = this.asset.bPoSNFTInfo.targetOwnerKey.startsWith('0x') ? this.asset.bPoSNFTInfo.targetOwnerKey.substring(2) : this.asset.bPoSNFTInfo.targetOwnerKey;
      const result = await GlobalElastosAPIService.instance.fetchDposNodes('all', NodeType.BPoS);
      if (result && !Util.isEmptyObject(result.producers)) {
          targetNode = result.producers.find( n => n.ownerpublickey == targetOwnerKey);
      }
      this.bposNFTInfos.push({
        title: this.translate.instant('dposvoting.node-name'),
        value: targetNode? targetNode.nickname : targetOwnerKey,
      })
    }

    async approveNFT() {
      let methodData = await this.erc721service.approve(this.nft.contractAddress, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS, this.asset.id);

      await this.native.hideLoading();

      if (methodData) {
        this.coinTransferService.masterWalletId = this.networkWallet.id;
        this.coinTransferService.payloadParam = {
            data: methodData,
            to: this.nft.contractAddress
        }

        void this.native.go("/wallet/intents/esctransaction", {intentMode: false});

        return new Promise<boolean>((resolve) => {
          let approveSubscription: Subscription = this.events.subscribe("esctransaction", (ret) => {

            approveSubscription.unsubscribe();
            if (ret.result.published) {
              resolve(true);
            } else {
              resolve(false);
            }
          })
        });
      }

      return true;
    }
}
