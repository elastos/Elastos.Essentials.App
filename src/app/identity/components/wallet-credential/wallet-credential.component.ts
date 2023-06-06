import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
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
    Logger.warn('identity', 'this.options', this.options);
    this.selectedMasterWallet = this.walletService.getMasterWallet(this.options.masterWalletId);
    this.networkWallet = this.walletService.getNetworkWalletFromMasterWalletId(this.options.masterWalletId);
    this.getAddresses();
  }

  async getAddresses() {

    if (this.networkService.isActiveNetworkElastosMainchain()) {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      this.addresses.push({type: WalletAddressType.WalletAddressType_ela, address: address});

      this.networkWallet.getMainTokenSubWallet()

      let escNetwork = await this.networkService.getNetworkByKey("elastossmartchain");
      if (escNetwork) {
        let escNetworkWallet = await escNetwork.createNetworkWallet(this.selectedMasterWallet, false);
        let address = escNetworkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
        this.addresses.push({type: WalletAddressType.WalletAddressType_evm, address: address});
      }
    }

    if (this.networkService.isActiveNetworkEVM()) {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      this.addresses.push({type: WalletAddressType.WalletAddressType_evm, address: address});

      // tron,iotex
    }

    if (this.networkService.activeNetwork.value.key === 'btc') {
      let address = this.networkWallet.getMainTokenSubWallet().getCurrentReceiverAddress();
      this.addresses.push({type: WalletAddressType.WalletAddressType_btc_legacy, address: address});
    }
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
    void this.modalCtrl.dismiss({
      addressList: this.addresses
    });
  }

  cancelOperation() {
    void this.modalCtrl.dismiss();
  }
}
