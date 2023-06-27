import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WalletAddress, WalletAddressType } from '../wallet-credential/wallet-credential.component';


/**
 * Filter method to return only some master wallets to show in the chooser.
 */
export type WalletChooserFilter = (wallets: AnyNetworkWallet) => boolean;

export type WalletChooserComponentOptions = {
  addresses: WalletAddress[],
  /**
   * Optional filter. Only returned wallets will show in the list.
   * Return true to keep the wallet in the list, false to hide it.
   */
  filter?: WalletChooserFilter;

}

/**
 * This dialog shows the list of all master wallets so that user can pick one.
 * For master wallets that are supported on the active network (network wallet exists), we show
 * more info such as the current native token balance here.
 */
@Component({
  selector: 'app-wallet-chooser',
  templateUrl: './wallet-chooser.component.html',
  styleUrls: ['./wallet-chooser.component.scss'],
})
export class WalletChooserComponent implements OnInit {
  public CoinType = CoinType;
  public options: WalletChooserComponentOptions = null;
  public selectedMasterWallet: MasterWallet;
  public masterWalletsToShowInList: MasterWallet[];
  public networkWalletsToShowInList: {
    [walletId: string]: AnyNetworkWallet;
  } = {};

  private addresses: WalletAddress[] = [];

  // Helper
  public WalletUtil = WalletUtil;

  constructor(
    private navParams: NavParams,
    private walletService: WalletService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController,
    public networkService: WalletNetworkService,
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;
    if (this.options.addresses) {
      this.addresses = this.options.addresses;
    }

    let networkWallets = this.walletService.getNetworkWalletsList();

    // Build the list of available network wallets from the master wallets
    this.networkWalletsToShowInList = {};
    networkWallets.forEach(networkWallet => {
      if (!this.options.filter || this.options.filter(networkWallet))
        this.networkWalletsToShowInList[networkWallet.id] = networkWallet;
    });

    this.masterWalletsToShowInList = Object.values(this.networkWalletsToShowInList).map(nw => nw.masterWallet);
  }

  public getNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    return this.networkWalletsToShowInList[masterWallet.id];
  }

  selectWallet(wallet: MasterWallet) {
    Logger.log("identity", "Wallet selected", wallet);
    if (this.supportsWalletCredentials(wallet)) {
      void this.modalCtrl.dismiss({
        selectedMasterWalletId: wallet.id
      });
    }
  }

  cancelOperation() {
    void this.modalCtrl.dismiss();
  }

  supportsWalletCredentials(masterWallet: MasterWallet) {
    switch (masterWallet.type) {
      case WalletType.MULTI_SIG_STANDARD:
      case WalletType.LEDGER:
      case WalletType.MULTI_SIG_EVM_GNOSIS:
          return false;
      default:
          return true;
    }
  }

  isSelectedWallet(wallet: MasterWallet) {
    if (!this.addresses || this.addresses.length <= 0) {
      return false;
    }

    let networkWallet = this.walletService.getNetworkWalletFromMasterWalletId(wallet.id);

    let publicKey = networkWallet.getPublicKey();
    if (this.addresses.findIndex(a => a.publicKey == publicKey) != -1) {
      // Check if the wallet was created by mnemonic.
      // If it was created by mnemonic, there must also be a btc in the address,
      // otherwise it may have been created using a private key.
      let createdByMnemonic = wallet.networkOptions.length > 0;
      let hasBTCAddress = this.addresses.findIndex( a => a.addressType == WalletAddressType.WalletAddressType_btc_legacy) !== -1;
      return createdByMnemonic ? hasBTCAddress : !hasBTCAddress;
    }

    return false;
  }
}
