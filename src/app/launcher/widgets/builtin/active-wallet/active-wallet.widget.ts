import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonSlides, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { reducedWalletAddress } from 'src/app/helpers/wallet.helper';
import { WalletAddressChooserComponent } from 'src/app/launcher/components/wallet-address-chooser/wallet-address-chooser.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet, WalletAddressInfo } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

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
export class ActiveWalletWidget implements OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service

  @ViewChild('walletsSlider') walletsSlider: IonSlides;

  private popover: HTMLIonPopoverElement = null;
  public masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = []
  public networkWalletsList: AnyNetworkWallet[] = [];
  public activeNetwork: AnyNetwork = null;
  private activeWalletAddresses: { [walletId: string]: WalletAddressInfo[] } = {};
  public backgroundGradient: string = null;

  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event
  private networkWalletSub: Subscription = null; // Subscription to wallet service to know when a wallet is created, deleted
  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes

  public walletsSlideOpts = {
    initialSlide: 0,
    speed: 200,
    spaceBetween: 10
  };

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
    public currencyService: CurrencyService
  ) { }

  ngOnInit(): Promise<void> {
    // Wait for wallet service to be initialized (existing wallets loaded) so we can display some balance
    // on the wallet widget.
    this.walletServiceSub = this.walletService.walletServiceStatus.subscribe((initializationComplete) => {
      if (initializationComplete) {
        void this.updateWidgetMainWallet();
      }
    });

    this.networkWalletSub = this.walletService.activeNetworkWallet.subscribe(networkWallet => {
      if (this.walletService.walletServiceStatus.value) {
        void this.updateWidgetMainWallet();
      }
    });

    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(networkName => {
      if (this.walletService.walletServiceStatus.value) {
        void this.updateWidgetMainWallet();
      }
    });

    return;
  }

  ngOnDestroy(): Promise<void> {
    console.log("ACTIVE WALLET TODO DISMISS POPOVER ON EXIT");

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

  public async onWalletWidgetSlideChanged() {
    let activeIndex = await this.walletsSlider.getActiveIndex();
    let newlyActiveWallet = this.masterWalletWithNetworkWalletList[activeIndex].networkWallet;
    let masterWallet = null;
    if (!newlyActiveWallet)
      masterWallet = this.masterWalletWithNetworkWalletList[activeIndex].masterWallet;
    void this.walletService.setActiveNetworkWallet(newlyActiveWallet, masterWallet);
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }

  public getFriendlyBalance(balance: BigNumber, decimalplace = -1): string {
    if (!balance || balance.isNaN()) {
      return '...';
    }

    if (decimalplace == -1) {
      decimalplace = this.currencyService.selectedCurrency.decimalplace;
    }
    if (!balance.isGreaterThan(1)) {
      decimalplace = 8;
    }

    return balance.decimalPlaces(decimalplace, BigNumber.ROUND_DOWN).toFixed();
  }

  private async updateWidgetMainWallet() {
    // Deprecated
    let activeWallet = this.walletService.activeNetworkWallet.value;
    if (activeWallet) {
      this.activeNetwork = this.walletNetworkService.activeNetwork.value;
    }
    else {
      this.activeNetwork = null;
    }

    // Widget will show all the master wallets, even some of them are unsupported on the active network.
    this.networkWalletsList = this.walletService.getNetworkWalletsList();
    let masterWallets = this.walletService.getMasterWalletsList();

    this.masterWalletWithNetworkWalletList = [];

    for (let masterWallet of masterWallets) {
      let networkWallet = this.networkWalletsList.find((nw) => nw.masterWallet.id === masterWallet.id)
      this.masterWalletWithNetworkWalletList.push({
        masterWallet: masterWallet,
        networkWallet: networkWallet
      })
    }

    // Select the active wallet in the wallets slides
    let activeWalletIndex = this.walletService.getActiveMasterWalletIndex();
    if (activeWalletIndex != -1) { // Happens if no wallet
      runDelayed(() => {
        // Delay 100ms: Wait for the initialization of the walletsSlider to complete.
        void this.walletsSlider.slideTo(activeWalletIndex, 0);
      }, 100);
    }

    // Save wallet addresses locally for easy copy
    this.activeWalletAddresses = {};
    for (let networkWallet of this.networkWalletsList) {
      this.activeWalletAddresses[networkWallet.id] = networkWallet.getAddresses();
    }

    // Background gradient color
    if (this.activeNetwork) {
      let networkColor = this.activeNetwork.getMainColor(); // RRGGBB
      let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
      this.backgroundGradient = `linear-gradient(90deg, #${gradientColor}BB 0%, #${gradientColor}00 80%)`;
    }
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
