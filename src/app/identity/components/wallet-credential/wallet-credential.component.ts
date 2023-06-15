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
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
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
    addressType: WalletAddressType,
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
    await GlobalNativeService.instance.showLoading();

    try {
      await this.getAddressByNetworkKey(WalletAddressType.WalletAddressType_ela);
      await this.getAddressByNetworkKey(WalletAddressType.WalletAddressType_evm);
      await this.getAddressByNetworkKey(WalletAddressType.WalletAddressType_iotex);
      await this.getAddressByNetworkKey(WalletAddressType.WalletAddressType_btc_legacy);
    } catch (e) {
      Logger.log('identity', 'getAddresses exception', e);
    }

    void GlobalNativeService.instance.hideLoading();

    Logger.log('identity', 'Address list:', this.addresses)
  }

  async getAddressByNetworkKey(addressType: WalletAddressType) {
    let networkKey = '';
    let addressUsage = AddressUsage.DEFAULT;
    let isELAMainChain = false;
    switch (addressType) {
      case WalletAddressType.WalletAddressType_ela:
        networkKey = 'elastos';
        isELAMainChain = true;
      break;
      case WalletAddressType.WalletAddressType_evm:
        networkKey = 'elastossmartchain';
      break;
      case WalletAddressType.WalletAddressType_btc_legacy:
        networkKey = 'btc';
      break;
      case WalletAddressType.WalletAddressType_iotex:
        networkKey = 'iotex';
        addressUsage = AddressUsage.IOTEX;
      break;
    }
    let network = await this.networkService.getNetworkByKey(networkKey);
    if (network) {
      let networkWallet = await network.createNetworkWallet(this.selectedMasterWallet, false);
      if (networkWallet) {
        if (!isELAMainChain || networkWallet.getNetworkOptions().singleAddress) {
          let address = networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress(addressUsage);
          this.addresses.push({addressType: addressType, address: address, publicKey: '', signature: ''});
        }
      }
    }
  }

  async getSignatureByNetworkKey(addressType: WalletAddressType, password: string) {
    let networkKey = '';
    switch (addressType) {
      case WalletAddressType.WalletAddressType_ela:
        networkKey = 'elastos';
      break;
      case WalletAddressType.WalletAddressType_evm:
        networkKey = 'elastossmartchain';
      break;
      case WalletAddressType.WalletAddressType_btc_legacy:
        networkKey = 'btc';
      break;
      case WalletAddressType.WalletAddressType_iotex:
        networkKey = 'iotex';
      break;
    }

    let walletAddress = this.addresses.find( a => a.addressType === addressType);
    if (walletAddress) {
      let network = await this.networkService.getNetworkByKey(networkKey);
      if (network) {
        let networkWallet = await network.createNetworkWallet(this.selectedMasterWallet, false);
        let publicKey = networkWallet.getPublicKey();
        let payload = DIDSessionsStore.signedInDIDString + walletAddress.address; // with prex '0x'
        let digest = SHA256.encodeToBuffer(Buffer.from(payload)).toString("hex");
        let signature = await networkWallet.signDigest(walletAddress.address, digest, password);
        if (signature) {
          walletAddress.publicKey = publicKey;
          walletAddress.signature = signature;
        }
      }
    }
  }

  async getSignature() {
    let password = await AuthService.instance.getWalletPassword(this.options.masterWalletId, true, false); // Don't force password

    await this.getSignatureByNetworkKey(WalletAddressType.WalletAddressType_ela, password);
    await this.getSignatureByNetworkKey(WalletAddressType.WalletAddressType_evm, password);
    await this.getSignatureByNetworkKey(WalletAddressType.WalletAddressType_iotex, password);
    await this.getSignatureByNetworkKey(WalletAddressType.WalletAddressType_btc_legacy, password);

    Logger.log('identity', 'Address list with signature:', this.addresses)
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

  async confirm() {
    try {
      await GlobalNativeService.instance.showLoading();
      await this.getSignature();
      void this.modalCtrl.dismiss({
        addressList: this.addresses
      });
    } finally {
      void GlobalNativeService.instance.hideLoading();
    }

  }

  cancelOperation() {
    void this.modalCtrl.dismiss();
  }
}
