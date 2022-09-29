import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CoinType } from '../../model/coin';
import { MasterWallet } from '../../model/masterwallets/masterwallet';
import { AnyNetworkWallet } from '../../model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from '../../model/wallet.util';
import { CurrencyService } from '../../services/currency.service';
import { Native } from '../../services/native.service';
import { WalletNetworkService } from '../../services/network.service';
import { UiService } from '../../services/ui.service';
import { WalletService } from '../../services/wallet.service';

/**
 * Filter method to return only some master wallets to show in the chooser.
 */
export type WalletChooserFilter = (wallets: AnyNetworkWallet) => boolean;

export type WalletChooserComponentOptions = {
  currentNetworkWallet: AnyNetworkWallet;
  /**
   * Optional filter. Only returned wallets will show in the list.
   * Return true to keep the walelt in the list, false to hide it.
   */
  filter?: WalletChooserFilter;
  /**
   * If true, the active wallet is pre-selected in the list. Otherwise, all wallets are displayed
   * in the same way.
   */
  showActiveWallet?: boolean;
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

  // Helper
  public WalletUtil = WalletUtil;

  constructor(
    private navParams: NavParams,
    private walletService: WalletService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController,
    public networkService: WalletNetworkService,
    private native: Native
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;

    if (this.options.showActiveWallet)
      this.selectedMasterWallet = this.options.currentNetworkWallet ? this.options.currentNetworkWallet.masterWallet : this.walletService.getActiveMasterWallet();
    else
      this.selectedMasterWallet = null;

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
    Logger.log("wallet", "Wallet selected", wallet);

    void this.modalCtrl.dismiss({
      selectedMasterWalletId: wallet.id
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Wallet selection cancelled");
    void this.modalCtrl.dismiss();
  }

  goToCreateWallet() {
    this.native.go("/wallet/settings", {
      createWallet: true
    });
    void this.modalCtrl.dismiss();
  }
}
