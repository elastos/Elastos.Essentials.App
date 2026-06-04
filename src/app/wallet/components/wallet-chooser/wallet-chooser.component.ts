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
 * Represents a wallet entry in the chooser, containing both master wallet and network wallet info when available.
 */
export interface WalletChooserEntry {
  masterWallet: MasterWallet;
  networkWallet?: AnyNetworkWallet; // May be undefined if wallet doesn't support the current network
}

/**
 * Filter method to return only some wallets to show in the chooser.
 * Receives a wallet entry that contains both master wallet and network wallet information.
 */
export type WalletChooserFilter = (walletEntry: WalletChooserEntry) => boolean;

export type WalletChooserComponentOptions = {
  currentNetworkWallet: AnyNetworkWallet;
  /**
   * Optional filter. Only returned wallets will show in the list.
   * Return true to keep the wallet in the list, false to hide it.
   */
  filter?: WalletChooserFilter;
  /**
   * If true, the active wallet is pre-selected in the list. Otherwise, all wallets are displayed
   * in the same way.
   */
  showActiveWallet?: boolean;
  /**
   * If true, use master wallet selection mode (for browser wallet connections).
   * If false, use network wallet selection mode (legacy multisig behavior).
   */
  masterWalletMode?: boolean;
  /**
   * If true, display current network balances for wallets.
   * Only applies when masterWalletMode is false.
   */
  showBalances?: boolean;
};

/**
 * This dialog shows the list of all master wallets so that user can pick one.
 * For master wallets that are supported on the active network (network wallet exists), we show
 * more info such as the current native token balance here.
 */
@Component({
  selector: 'app-wallet-chooser',
  templateUrl: './wallet-chooser.component.html',
  styleUrls: ['./wallet-chooser.component.scss']
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
  ) {}

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;

    // Set defaults
    if (this.options.masterWalletMode === undefined) {
      this.options.masterWalletMode = false;
    }
    if (this.options.showBalances === undefined) {
      this.options.showBalances = !this.options.masterWalletMode; // Show balances by default for legacy mode, hide for master wallet mode
    }

    if (this.options.showActiveWallet) {
      this.selectedMasterWallet = this.options.currentNetworkWallet
        ? this.options.currentNetworkWallet.masterWallet
        : this.walletService.getActiveMasterWallet();
    } else {
      this.selectedMasterWallet = null;
    }

    // Build wallet entries for filtering
    const walletEntries = this.buildWalletEntries();

    // Apply filter if provided
    const filteredEntries = this.options.filter ? walletEntries.filter(this.options.filter) : walletEntries;

    // Extract master wallets from filtered entries
    this.masterWalletsToShowInList = filteredEntries.map(entry => entry.masterWallet);
    Logger.log('wallet', 'wallet chooser - master wallets to show in list:', this.masterWalletsToShowInList);

    // Build network wallet mapping for display purposes
    this.networkWalletsToShowInList = {};
    filteredEntries.forEach(entry => {
      if (entry.networkWallet) {
        this.networkWalletsToShowInList[entry.masterWallet.id] = entry.networkWallet;
      }
    });
  }

  /**
   * Builds wallet entries based on the current mode
   */
  private buildWalletEntries(): WalletChooserEntry[] {
    if (this.options.masterWalletMode) {
      // Master wallet mode: include all master wallets
      const allMasterWallets = this.walletService.getMasterWalletsList();
      console.log('wallet', 'wallet chooser - master wallet mode, all master wallets:', allMasterWallets);

      return allMasterWallets.map(masterWallet => {
        const networkWallet = this.walletService.getNetworkWalletFromMasterWalletId(masterWallet.id);
        return {
          masterWallet,
          networkWallet
        };
      });
    } else {
      // Legacy network wallet mode: only include wallets with network wallets
      const networkWallets = this.walletService.getNetworkWalletsList();
      console.log('wallet', 'wallet chooser - network wallet mode, network wallets:', networkWallets);

      return networkWallets.map(networkWallet => ({
        masterWallet: networkWallet.masterWallet,
        networkWallet
      }));
    }
  }

  public getNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    return this.networkWalletsToShowInList[masterWallet.id];
  }

  selectWallet(wallet: MasterWallet) {
    Logger.log('wallet', 'Wallet selected', wallet);

    void this.modalCtrl.dismiss({
      selectedMasterWalletId: wallet.id
    });
  }

  cancelOperation() {
    Logger.log('wallet', 'Wallet selection cancelled');
    void this.modalCtrl.dismiss();
  }

  goToCreateWallet() {
    this.native.go('/wallet/settings', {
      createWallet: true
    });
    void this.modalCtrl.dismiss();
  }
}
