import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { reducedWalletAddress } from 'src/app/helpers/wallet.helper';
import { WalletAddressChooserComponent } from 'src/app/launcher/components/wallet-address-chooser/wallet-address-chooser.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet, WalletAddressInfo } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WidgetBase } from '../../base/widgetbase';

// The networkWallet is null if the masterWallet is not supported on the active netowrk.
type MasterWalletWithNetworkWallet = {
  masterWallet: MasterWallet;
  networkWallet: AnyNetworkWallet
}

@Component({
  selector: 'widget-active-wallet',
  templateUrl: './active-wallet.widget.html',
  styleUrls: ['./active-wallet.widget.scss'],
})
export class ActiveWalletWidget extends WidgetBase implements OnInit, OnDestroy {
  public activeWalletEntry: MasterWalletWithNetworkWallet = null;
  public activeWalletIndex = -1;
  private activatingWallet = false;
  public initializationComplete = false;

  private popover: HTMLIonPopoverElement = null;
  public masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = []
  public networkWalletsList: AnyNetworkWallet[] = [];
  private activeWalletAddresses: { [walletId: string]: WalletAddressInfo[] } = {};
  public backgroundGradient: string = null;

  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event
  private networkWalletSub: Subscription = null; // Subscription to wallet service to know when a wallet is created, deleted
  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes

  public WalletUtil = WalletUtil;

  constructor(
    public theme: GlobalThemeService,
    private nav: GlobalNavService,
    private popoverCtrl: PopoverController,
    public walletService: WalletService,
    private walletNetworkUIService: WalletNetworkUIService,
    private walletInitService: WalletInitService,
    public walletNetworkService: WalletNetworkService,
    private globalNative: GlobalNativeService,
    public translate: TranslateService,
    public currencyService: CurrencyService,
    private zone: NgZone
  ) {
    super();
  }

  ngOnInit(): Promise<void> {
    // Wait for wallet service to be initialized (existing wallets loaded) so we can display some balance
    // on the wallet widget.
    this.walletServiceSub = this.walletService.walletServiceStatus.subscribe((initializationComplete) => {
      //console.log("walletServiceStatus", initializationComplete)
      if (initializationComplete) {
        this.initializationComplete = true;
        // this.notifyReadyToDisplay();
        void this.updateWidgetMainWallet();
      }
    });

    this.networkWalletSub = this.walletService.activeNetworkWallet.subscribe(networkWallet => {
      //console.log("activeNetworkWallet", networkWallet, this.walletService.walletServiceStatus.value)
      if (this.walletService.walletServiceStatus.value) {
        // Note: maybe some networkwallets are not created.
        void this.updateWidgetMainWallet();
      }
    });

    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(networkName => {
      //console.log("networkName", networkName)
      // Background gradient color
      if (this.walletNetworkService.activeNetwork.value) {
        // All networkwallets are created, load all.
        void this.updateWidgetMainWallet();

        let networkColor = this.walletNetworkService.activeNetwork.value.getMainColor(); // RRGGBB
        let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
        this.backgroundGradient = `linear-gradient(90deg, #${gradientColor}BB 0%, #${gradientColor}00 80%)`;
      }
    });

    // The initialization of the wallet service takes several seconds,
    // In order to display the main page as soon as possible, don't wait for the wallet service initialization to be completed.
    this.notifyReadyToDisplay();
    return;
  }

  ngOnDestroy(): Promise<void> {
    if (this.walletServiceSub) {
      this.walletServiceSub.unsubscribe();
      this.walletServiceSub = null;
    }
    if (this.networkWalletSub) {
      this.networkWalletSub.unsubscribe();
      this.networkWalletSub = null;
    }
    if (this.activeNetworkSub) {
      this.activeNetworkSub.unsubscribe();
      this.activeNetworkSub = null;
    }

    return;
  }

  public openWallet() {
    this.walletInitService.start()
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }

  private updateWidgetMainWallet() {
    //console.log("updateWidgetMainWallet")

    // Widget will show all the master wallets, even if some of them are unsupported on the active network.
    let networkWalletsList = this.walletService.getNetworkWalletsList();
    let masterWallets = this.walletService.getMasterWalletsList();

    let masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = [];

    for (let masterWallet of masterWallets) {
      let networkWallet = networkWalletsList.find((nw) => nw.masterWallet.id === masterWallet.id)
      masterWalletWithNetworkWalletList.push({
        masterWallet: masterWallet,
        networkWallet: networkWallet
      });
    }

    // Save wallet addresses locally for easy copy
    this.activeWalletAddresses = {};
    for (let networkWallet of networkWalletsList) {
      this.activeWalletAddresses[networkWallet.id] = networkWallet.getAddresses();
    }

    // Background gradient color
    // if (this.walletNetworkService.activeNetwork.value) {
    //   let networkColor = this.walletNetworkService.activeNetwork.value.getMainColor(); // RRGGBB
    //   let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
    //   this.backgroundGradient = `linear-gradient(90deg, #${gradientColor}BB 0%, #${gradientColor}00 80%)`;
    // }

    this.networkWalletsList = networkWalletsList;
    this.masterWalletWithNetworkWalletList = masterWalletWithNetworkWalletList;

    // Update our active wallet on UI
    void this.setActiveWalletByIndex(this.walletService.getActiveMasterWalletIndex(), false);
  }

  private async setActiveWalletByIndex(index: number, activate = true) {
    this.activeWalletIndex = index;
    this.activeWalletEntry = this.masterWalletWithNetworkWalletList[this.activeWalletIndex];

    if (activate && !this.activatingWallet) {
      this.activatingWallet = true;

      let newlyActiveWallet = this.masterWalletWithNetworkWalletList[index].networkWallet;
      let masterWallet = null;
      if (!newlyActiveWallet)
        masterWallet = this.masterWalletWithNetworkWalletList[index].masterWallet;

      await this.walletService.setActiveNetworkWallet(newlyActiveWallet, masterWallet);

      this.activatingWallet = false;
    }
  }

  public prevWallet() {
    let newIndex = this.activeWalletIndex > 0 ? this.activeWalletIndex - 1 : this.masterWalletWithNetworkWalletList.length - 1;
    void this.setActiveWalletByIndex(newIndex);
  }

  public nextWallet() {
    let newIndex = (this.activeWalletIndex + 1) % this.masterWalletWithNetworkWalletList.length;
    void this.setActiveWalletByIndex(newIndex);
  }

  public goToWalletIndex(index: number) {
    void this.setActiveWalletByIndex(index);
  }

  public getWalletAddresses(wallet: AnyNetworkWallet): WalletAddressInfo[] {
    if (!this.activeWalletAddresses[wallet.id])
      return [];

    return Object.values(this.activeWalletAddresses[wallet.id]);
  }

  public async pickWalletAddress(event, networkWallet: AnyNetworkWallet) {
    event.preventDefault();
    event.stopPropagation();

    let addresses = this.getWalletAddresses(networkWallet);

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: WalletAddressChooserComponent,
      componentProps: {
        addresses
      },
      cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-address-chooser-component' : 'launcher-address-chooser-component-dark',
      event: event,
      translucent: false
    });
    void this.popover.onWillDismiss().then((resp) => {
      this.popover = null;
    });
    return await this.popover.present();
  }

  public getReducedWalletAddress(address: string) {
    return reducedWalletAddress(address);
  }

  /**
   * Copies the first and only wallet address for the active wallet on the widget, for the active network.
   * Address is copied to the clipboard and a toast confirmation is shown.
   */
  public copySingleAddressToClipboard(event, address: string) {
    event.preventDefault();
    event.stopPropagation();

    let confirmationMessage = this.translate.instant('launcher.address-copied-to-clipboard', { address });
    this.globalNative.genericToast(confirmationMessage);
    void this.globalNative.copyClipboard(address);
  }
}
