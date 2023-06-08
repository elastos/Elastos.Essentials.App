import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SHA256 } from 'src/app/helpers/crypto/sha256';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

export type WalletCredentialComponentOptions = {
  masterWalletId: string;
}

export enum WalletAddressType {
  WalletAddressType_btc_legacy = 'btclegacy',
  WalletAddressType_ela = 'elastosmainchain',
  WalletAddressType_evm = 'evm',
  WalletAddressType_iotex = 'iotex',
  WalletAddressType_tron = 'tron',
}

export type WalletAddress = {
    type: WalletAddressType,
    address: string,
    publicKey: string,
    signature: string, // result of signature of concat(did, wallet address)
}

/**
 * This dialog shows the list of all master wallets so that user can pick one.
 * For master wallets that are supported on the active network (network wallet exists), we show
 * more info such as the current native token balance here.
 */
@Component({
  selector: 'app-wallet-credential',
  templateUrl: './wallet-credential.component.html',
  styleUrls: ['./wallet-credential.component.scss'],
})
export class WalletCredentialComponent implements OnInit {
  public CoinType = CoinType;
  public options = null;
  public selectedMasterWallet: MasterWallet;
  public networkWallet: AnyNetworkWallet = null;
  public addresses: WalletAddress[] = [];

  // Helper
  public WalletUtil = WalletUtil;

  constructor(
    private navParams: NavParams,
    private walletService: WalletService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    public currencyService: CurrencyService,
    public networkService: WalletNetworkService,
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data;
    this.selectedMasterWallet = this.walletService.getMasterWallet(this.options.masterWalletId);
    this.networkWallet = this.walletService.getNetworkWalletFromMasterWalletId(this.options.masterWalletId);
    this.getAddresses();
  }

  async getAddresses() {
    let password = await AuthService.instance.getWalletPassword(this.options.masterWalletId, true, false); // Don't force password

    void GlobalNativeService.instance.showLoading();

    if (this.networkService.isActiveNetworkElastosMainchain()) {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      let publicKey = this.networkWallet.getPublicKey();
      let payload = DIDSessionsStore.signedInDIDString + address; // with prex '0x'
      let digest = SHA256.encodeToBuffer(Buffer.from(payload)).toString("hex");
      let signature = await this.networkWallet.signDigest(address, digest, password);
      this.addresses.push({type: WalletAddressType.WalletAddressType_ela, address: address, publicKey: publicKey, signature: signature});

      this.networkWallet.getMainTokenSubWallet()

      let escNetwork = await this.networkService.getNetworkByKey("elastossmartchain");
      if (escNetwork) {
        let escNetworkWallet = await escNetwork.createNetworkWallet(this.selectedMasterWallet, false);
        let address = escNetworkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
        let publicKey = escNetworkWallet.getPublicKey();
        let payload = DIDSessionsStore.signedInDIDString + address; // with prex '0x'
        let digest = SHA256.encodeToBuffer(Buffer.from(payload)).toString("hex");
        let signature = await escNetworkWallet.signDigest('', digest, password);
        this.addresses.push({type: WalletAddressType.WalletAddressType_evm, address: address, publicKey: publicKey, signature: signature});
      }
    }

    if (this.networkService.isActiveNetworkEVM()) {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      let publicKey = this.networkWallet.getPublicKey();
      let payload = DIDSessionsStore.signedInDIDString + address; // with prex '0x'
      let digest = SHA256.encodeToBuffer(Buffer.from(payload)).toString("hex");
      let signature = await this.networkWallet.signDigest('', digest, password);
      this.addresses.push({type: WalletAddressType.WalletAddressType_evm, address: address, publicKey: publicKey, signature: signature});

      // tron,iotex
    }

    if (this.networkService.activeNetwork.value.key === 'btc') {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      let publicKey = this.networkWallet.getPublicKey();
      this.addresses.push({type: WalletAddressType.WalletAddressType_btc_legacy, address: address, publicKey: publicKey, signature:""});
    }

    void GlobalNativeService.instance.hideLoading();

    Logger.log('identity', 'Address list:', this.addresses)
  }

  getAddressTitle(type: WalletAddressType) {
    switch (type) {
      case WalletAddressType.WalletAddressType_btc_legacy:
        return 'BTC';
      case WalletAddressType.WalletAddressType_ela:
        return 'ELA';
      case WalletAddressType.WalletAddressType_evm:
        return "EVM";
      case WalletAddressType.WalletAddressType_iotex:
        return 'IOTEX';
      case WalletAddressType.WalletAddressType_tron:
        return 'TVM';
    }
  }

  confirm() {
    // TODO: sign data here

    void this.modalCtrl.dismiss({
      addressList: this.addresses
    });
  }

  cancelOperation() {
    void this.modalCtrl.dismiss();
  }
}
