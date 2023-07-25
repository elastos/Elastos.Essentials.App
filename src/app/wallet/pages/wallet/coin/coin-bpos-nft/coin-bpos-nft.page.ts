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

import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { SHA256 } from 'src/app/helpers/crypto/sha256';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { TxConfirmComponent } from 'src/app/wallet/components/tx-confirm/tx-confirm.component';
import { MintBPoSNFTTxStatus } from 'src/app/wallet/model/elastos.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { EscSubWallet } from 'src/app/wallet/model/networks/elastos/evms/esc/subwallets/esc.evm.subwallet';
import { ESCTransactionBuilder } from 'src/app/wallet/model/networks/elastos/evms/esc/tx-builders/esc.txbuilder';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Transfer, TransferType } from 'src/app/wallet/services/cointransfer.service';
import { BPoSERC721Service } from 'src/app/wallet/services/evm/bpos.erc721.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Native } from '../../../../services/native.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-bpos-nft',
    templateUrl: './coin-bpos-nft.page.html',
    styleUrls: ['./coin-bpos-nft.page.scss'],
})
export class CoinBPoSNFTPage {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWalletId = null;
    public networkWallet: AnyNetworkWallet = null;
    private sourceSubwallet: EscSubWallet;
    private receiverAddress = null;
    private escTxBuilder: ESCTransactionBuilder;

    private txid = '';
    private signature = '';
    private publicKey = '';
    public gasPrice = '';
    public gasPriceGwei = '';
    public gasLimit = '';
    public fee: BigNumber = null; // WEI
    public feeDisplay = ''; // ELA

    public dataFetched = false;
    public isExecuting = false;

    public claimableNfts = [];

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public translate: TranslateService,
        public native: Native,
        public theme: GlobalThemeService,
        public uiService: UiService,
        public globalPopupService: GlobalPopupService,
        private storage: GlobalStorageService
    ) {
        void this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.bpos-nft-title"));
    }

    async init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            // Retrieve the master wallet
            this.masterWalletId = navigation.extras.state.masterWalletId;
            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
            this.sourceSubwallet = this.networkWallet.getMainTokenSubWallet() as EscSubWallet;
            this.escTxBuilder = new ESCTransactionBuilder(this.networkWallet);

            this.receiverAddress = this.sourceSubwallet.getCurrentReceiverAddress();
        }

        let txList = this.sourceSubwallet.getUnClaimedTxs();
        for (let i = 0; i < txList.length; i++) {
          let ret = await BPoSERC721Service.instance.canClaim(txList[i].txid);
          Logger.log('wallet', 'canClaim ', txList[i], ret);
          if (null == ret) {
            // Do nothing
            // TODO: remove useless txid?
          } else if ('0' == ret) {
            txList[i].status = MintBPoSNFTTxStatus.Claimed;
            this.sourceSubwallet.updateMintNFTTx(txList[i]);
          } else {
            txList[i].status = MintBPoSNFTTxStatus.Claimable;
            this.sourceSubwallet.updateMintNFTTx(txList[i]);
          }
        }

        this.claimableNfts = txList.filter( t => t.status == MintBPoSNFTTxStatus.Claimable).map( t => {
          return t.txid;
        });
        this.dataFetched = true;
    }

    async claimBPosNFT(index: number, node: any) {
        Logger.log('wallet', 'claimBPosNFT', this.claimableNfts[index], this.receiverAddress)

        this.isExecuting = true;
        try {
            await this.native.showLoading(this.translate.instant('common.please-wait'));

            let txid = this.claimableNfts[index].startsWith('0x') ? this.claimableNfts[index].substring(2) : this.claimableNfts[index];
            let ret = await this.getNFTSignatureFromMainChain(this.claimableNfts[index], this.receiverAddress);
              if (!ret) { // cancelled by user
                  this.isExecuting = false;
                  await this.native.hideLoading();
                  return;
              }
            Logger.log('wallet', 'signature data:', ret);

            this.txid = '0x' + Util.reverseHexToBE(txid);

            ret.signature.startsWith('0x') ? this.signature = ret.signature : this.signature = '0x' + ret.signature;
            ret.publicKey.startsWith('0x') ? this.publicKey = ret.publicKey : this.publicKey = '0x' + ret.publicKey;

            await this.estimateGas(this.txid, this.receiverAddress, this.signature, this.publicKey);
            await this.native.hideLoading();
            void this.showConfirm();
        } catch (e) {
            this.isExecuting = false;
            await this.native.hideLoading();
            Logger.warn('wallet', 'claimBPosNFT exception:', e);
        }
    }

    async getNFTSignatureFromMainChain(txid: string, receiver: string) {
        Logger.log('wallet', 'getNFTSignatureFromMainChain', txid, receiver);

        let data = this.getSignatureData(txid, receiver);
        let digest = SHA256.encodeToBuffer(Buffer.from(data, 'hex')).toString('hex');
        const password = await AuthService.instance.getWalletPassword(this.masterWalletId);
        if (password === null) {// cancelled by user
            return null;
        }

        let elastosNetworks = WalletNetworkService.instance.getNetworkByKey('elastos');
        let elaMainChainNetworkWallet = await elastosNetworks.createNetworkWallet(this.networkWallet.masterWallet, false);
        if (!elaMainChainNetworkWallet) {
            return null;
        }

        // Sign data with the public key of the first external address that has the same public key as stake address.
        let subWallet = elaMainChainNetworkWallet.getMainTokenSubWallet() as MainChainSubWallet;
        let firstExternalAddress = subWallet.getCurrentReceiverAddress();
        let signature = await subWallet.signDigest(firstExternalAddress, digest, password);

        let publicKey = null;
        let publicKeys = subWallet.getPublicKeys(0, 1, false);
        if (publicKeys && publicKeys[0]) {
            publicKey = publicKeys[0]
        }
        return {signature, publicKey};
    }

    getSignatureData(txid: string, address: string) {
        let txidEx = txid.startsWith('0x') ? txid.substring(2) : txid;
        let addressEx = address.startsWith('0x') ? address.substring(2) : address;

        return Util.reverseHexToBE(txidEx) + addressEx;
    }

    async estimateGas(txid: string, address: string, signature: string, publicKey: string) {
        this.gasLimit = await this.escTxBuilder.estimateClaimBPoSNFTGas(txid, address, signature, publicKey, 1);
    }

    async createClaimBPoSNFTTransaction(txid: string, address: string, signature: string, publicKey: string) {
      Logger.log('wallet', 'Calling createClaimBPoSNFTTransaction() txid', txid, ' address:', address, ' signature:', signature, ' publicKey:', publicKey);
      await this.native.showLoading(this.translate.instant('common.please-wait'));

      try {
          const rawTx = await this.escTxBuilder.createClaimBPoSNFTTransaction(txid, address, signature, publicKey, 1, this.gasPrice, this.gasLimit);
          await this.native.hideLoading();
          if (rawTx) {
              const transfer = new Transfer();
              Object.assign(transfer, {
                  masterWalletId: this.networkWallet.id,
                  subWalletId: this.sourceSubwallet.id,
                  payPassword: '',
                  action: null,
                  intentId: null,
              });
              const result = await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
              if (result.published) {
                  void this.storage.deleteSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "bposvoting", "bposnft-" + txid);
              }
          }
      }
      catch (e) {
          Logger.warn('wallet', 'createClaimBPoSNFTTransaction exception:', e);
          await this.native.hideLoading();
          await this.globalPopupService.ionicAlert('wallet.transaction-fail', 'Unknown error, possibly a network issue');
      }
    }

    async showConfirm() {
      const txInfo = {
          type: TransferType.CLAIM_NFT,
          transferFrom: this.receiverAddress,
          transferTo: this.receiverAddress,
          toChainId: null,
          amount: 0,
          sendAll: false,
          precision: this.sourceSubwallet.tokenDecimals,
          memo: null,
          tokensymbol: WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol(),
          fee: null,
          gasLimit: this.gasLimit,
          coinType: this.sourceSubwallet.type
      }

      this.native.popup = await this.native.popoverCtrl.create({
          mode: 'ios',
          cssClass: 'wallet-tx-component',
          component: TxConfirmComponent,
          componentProps: {
              txInfo: txInfo
          }
      });
      this.native.popup.onWillDismiss().then((params) => {
          this.native.popup = null;
          Logger.log('wallet', 'Confirm tx params', params);
          if (params.data && params.data.confirm) {
              if (params.data.gasPrice) this.gasPrice = params.data.gasPrice;
              if (params.data.gasLimit) this.gasLimit = params.data.gasLimit;
              void this.createClaimBPoSNFTTransaction(this.txid, this.receiverAddress, this.signature, this.publicKey);
          }

          this.isExecuting = false;
      });

      return await this.native.popup.present();
  }
}
