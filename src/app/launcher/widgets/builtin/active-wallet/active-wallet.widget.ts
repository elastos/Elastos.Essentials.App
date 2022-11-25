import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonSlides, PopoverController } from '@ionic/angular';
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
  private _walletsSlider: IonSlides;
  @ViewChild('walletsSlider') set walletsSlider(_walletsSlider: IonSlides) {
    this._walletsSlider = _walletsSlider;

    if (_walletsSlider && !this.initialSliderSlideDone) {
      // First time the slider is available: initialize it and position it to the right slide (active wallet).
      // This won't happen until the active wallet is ready as we only notify the container that this widget is "ready"
      // after receiving the wallet status "initialized". And this is only after all widgets are ready that the container
      // removed the spinner, which makes the widgets shown and this slider becoming defined.
      void this._walletsSlider.getSwiper().then(swiper => {
        swiper.init();
        void this.updateWidgetMainWallet();
        this.initialSliderSlideDone = true;
      });
    }
  }

  private popover: HTMLIonPopoverElement = null;
  public masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = []
  public networkWalletsList: AnyNetworkWallet[] = [];
  private activeWalletAddresses: { [walletId: string]: WalletAddressInfo[] } = {};
  public backgroundGradient: string = null;
  private initialSliderSlideDone = false;

  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event
  private networkWalletSub: Subscription = null; // Subscription to wallet service to know when a wallet is created, deleted
  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes

  public walletsSlideOpts = {
    init: false, // Need manual init when the slider gets displayed, otherwise it's messed up with the container spinner delaying widgets creation in DOM.
    initialSlide: 0,
    speed: 200,
    spaceBetween: 10
  };

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
        this.notifyReadyToDisplay();
        void this.updateWidgetMainWallet();
      }
    });

    this.networkWalletSub = this.walletService.activeNetworkWallet.subscribe(networkWallet => {
      //console.log("activeNetworkWallet", networkWallet, this.walletService.walletServiceStatus.value)
      if (this.walletService.walletServiceStatus.value) {
        void this.updateWidgetMainWallet();
      }
    });

    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(networkName => {
      //console.log("activeNetwork", networkName, this.walletService.walletServiceStatus.value)
      if (this.walletService.walletServiceStatus.value) {
        void this.updateWidgetMainWallet();
      }
    });

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

  public async onWalletWidgetSlideChanged() {
    if (!this._walletsSlider || !this.masterWalletWithNetworkWalletList || this.masterWalletWithNetworkWalletList.length === 0)
      return;

    let activeIndex = await this._walletsSlider.getActiveIndex();
    let newlyActiveWallet = this.masterWalletWithNetworkWalletList[activeIndex].networkWallet;
    let masterWallet = null;
    if (!newlyActiveWallet)
      masterWallet = this.masterWalletWithNetworkWalletList[activeIndex].masterWallet;
    void this.walletService.setActiveNetworkWallet(newlyActiveWallet, masterWallet);
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }

  private async updateWidgetMainWallet() {
    //console.log("updateWidgetMainWallet")

    // Widget will show all the master wallets, even some of them are unsupported on the active network.
    let networkWalletsList = this.walletService.getNetworkWalletsList();
    let masterWallets = this.walletService.getMasterWalletsList();

    let masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = [];

    for (let masterWallet of masterWallets) {
      let networkWallet = networkWalletsList.find((nw) => nw.masterWallet.id === masterWallet.id)
      masterWalletWithNetworkWalletList.push({
        masterWallet: masterWallet,
        networkWallet: networkWallet
      })
    }

    // Save wallet addresses locally for easy copy
    this.activeWalletAddresses = {};
    for (let networkWallet of networkWalletsList) {
      this.activeWalletAddresses[networkWallet.id] = networkWallet.getAddresses();
    }

    // Background gradient color
    if (this.walletNetworkService.activeNetwork.value) {
      let networkColor = this.walletNetworkService.activeNetwork.value.getMainColor(); // RRGGBB
      let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
      this.backgroundGradient = `linear-gradient(90deg, #${gradientColor}BB 0%, #${gradientColor}00 80%)`;
    }

    this.networkWalletsList = networkWalletsList;
    this.masterWalletWithNetworkWalletList = masterWalletWithNetworkWalletList;

    // Active wallet changed by an external entity, update our active slider widget
    if (this._walletsSlider && this.walletService.getActiveMasterWalletIndex() !== await this._walletsSlider.getActiveIndex()) {
      void this.slideToActiveWallet();
    }
  }

  /**
   * Called once by ion-slides when the slider is initialized
   */
  public slideToActiveWallet() {
    if (!this._walletsSlider)
      return;

    // Select the active wallet in the wallets slides
    let activeWalletIndex = this.walletService.getActiveMasterWalletIndex();
    //console.log("sliding to active wallet, activeWalletIndex=", activeWalletIndex, "slider index", await this._walletsSlider.getActiveIndex(), this._walletsSlider)
    if (activeWalletIndex != -1) { // Happens if no wallet
      this.zone.run(() => {
        void this._walletsSlider.slideTo(activeWalletIndex, 0);
      });
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
