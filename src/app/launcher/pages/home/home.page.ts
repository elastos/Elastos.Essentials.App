import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { IonSlides, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import type WalletConnect from '@walletconnect/client';
import BigNumber from 'bignumber.js';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { BrowsedAppInfo } from 'src/app/dappbrowser/model/browsedappinfo';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { reducedWalletAddress } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { Packet } from 'src/app/redpackets/model/packets.model';
import { PacketService } from 'src/app/redpackets/services/packet.service';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet, WalletAddressInfo } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { OptionsComponent } from '../../components/options/options.component';
import { WalletAddressChooserComponent } from '../../components/wallet-address-chooser/wallet-address-chooser.component';
import { AppmanagerService } from '../../services/appmanager.service';
import { DIDManagerService } from '../../services/didmanager.service';
import { NotificationsPage } from '../notifications/notifications.page';

// The networkWallet is null if the masterWallet is not supported on the active netowrk.
type MasterWalletWithNetworkWallet = {
  masterWallet: MasterWallet;
  networkWallet: AnyNetworkWallet
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild('walletsSlider') walletsSlider: IonSlides;

  private popover: HTMLIonPopoverElement = null;
  private modal: any = null;
  public identityNeedsBackup = false;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event
  private networkWalletSub: Subscription = null; // Subscription to wallet service to know when a wallet is created, deleted
  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes
  private vaultStatusSub: Subscription = null; // Subscription to vault link status event
  private walletConnectSub: Subscription = null; // Subscription to wallet connect active sessions
  private recentAppsSub: Subscription = null; // Susbcription to recently used dApps (browser)
  private themeSubscription: Subscription = null; // Subscription to theme change
  private publicRedPacketsSubscription: Subscription = null; // Public red packets that can be grabbed

  // Widget data
  public masterWalletWithNetworkWalletList: MasterWalletWithNetworkWallet[] = []
  public networkWalletsList: AnyNetworkWallet[] = [];
  public activeNetwork: AnyNetwork = null;
  private activeWalletAddresses: { [walletId: string]: WalletAddressInfo[] } = {};
  public hiveVaultLinked = false;
  public hiveVaultStorageStats: {
    usedStorage: string; // Used storage, formatted for display, in GB
    maxStorage: string;  // Max storage, formatted for display, in GB
    usageRatio: number // usedStorage / maxStorage ratio, 0-1 numeric range
    percentUsage: string; // usedStorage / maxStorage ratio, 0-100% string
  } = null;
  public walletConnectConnectors: WalletConnect[] = [];
  public recentApps: BrowsedAppInfo[] = [];
  public publicRedPackets: Packet[] = [];

  public walletsSlideOpts = {
    initialSlide: 0,
    speed: 200,
    spaceBetween: 10
  };

  constructor(
    public toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    public translate: TranslateService,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private modalCtrl: ModalController,
    private zone: NgZone,
    private appBackGroundService: GlobalAppBackgroundService,
    public walletService: WalletService,
    public walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService,
    public walletUIService: UiService,
    private walletInitService: WalletInitService,
    public currencyService: CurrencyService,
    private globalNetworksService: GlobalNetworksService,
    private globalHiveService: GlobalHiveService,
    private globalWalletConnectService: GlobalWalletConnectService,
    private globalStartupService: GlobalStartupService,
    private globalNavService: GlobalNavService,
    private globalNative: GlobalNativeService,
    private browserService: DappBrowserService,
    private packetService: PacketService,
    private didSessions: GlobalDIDSessionsService) {
  }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    Logger.log("launcher", "Launcher home screen will enter");
    /*  setTimeout(()=>{
       const notification = {
         key: 'storagePlanExpiring',
         title: 'Storage Plan Expiring',
         message: 'You have a storage plan expiring soon. Please renew your plan before the expiration time.',
         app: App.WALLET
       };
       this.globalNotifications.sendNotification(notification);
     }, 2000); */

    this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "notifications",
      iconPath: BuiltInIcon.NOTIFICATIONS
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case 'notifications':
          void this.showNotifications();
          break;
        case 'scan':
          void this.globalNavService.navigateTo(App.SCANNER, "/scanner/scan");
          break;
        case 'settings':
          void this.globalNavService.navigateTo(App.SETTINGS, "/settings/menu");
          break;
      }
    });

    if (this.theme.darkMode) {
      this.titleBar.setTheme('#121212', TitleBarForegroundMode.LIGHT);
    } else {
      this.titleBar.setTheme('#F5F5FD', TitleBarForegroundMode.DARK);
    }

    this.themeSubscription = this.theme.activeTheme.subscribe(theme => {
      if (theme === AppTheme.DARK) {
        this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
          key: "scan",
          iconPath: "/assets/launcher/icons/dark_mode/scan.svg"
        });
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
          key: "settings",
          iconPath: "/assets/launcher/icons/dark_mode/settings.svg"
        });
      }
      else {
        this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
          key: "scan",
          iconPath: "/assets/launcher/icons/scan.svg"
        });
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
          key: "settings",
          iconPath: "/assets/launcher/icons/settings.svg"
        });
      }
    });

    this.identityNeedsBackup = !(await this.didSessions.activeIdentityWasBackedUp());

    if (this.didService.signedIdentity) { // Should not happen, just in case - for ionic hot reload
      this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
        switch (template) {
          case MAINNET_TEMPLATE:
            this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
            break;
          case TESTNET_TEMPLATE:
            this.titleBar.setTitle('TEST NET Active');
            break;
          case 'LRW':
            this.titleBar.setTitle('CR Private Net Active');
            break;
        }
      });
    }

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

    // Wait to know user's hive vault status to show the hive storage widget
    this.vaultStatusSub = this.globalHiveService.vaultStatus.subscribe((vaultStatus) => {
      if (vaultStatus && vaultStatus.vaultInfo && vaultStatus.vaultInfo) {
        let usedStorageGb = vaultStatus.vaultInfo.getStorageUsed() / (1024 * 1024 * 1024);
        let maxStorageGb = vaultStatus.vaultInfo.getStorageQuota() / (1024 * 1024 * 1024);

        this.hiveVaultStorageStats = {
          usedStorage: usedStorageGb.toFixed(2),
          maxStorage: maxStorageGb.toFixed(2),
          usageRatio: usedStorageGb / maxStorageGb,
          percentUsage: (100 * usedStorageGb / maxStorageGb).toFixed(1)
        };
        this.hiveVaultLinked = true;
      }
    });

    this.walletConnectSub = this.globalWalletConnectService.walletConnectSessionsStatus.subscribe(connectors => {
      this.zone.run(() => {
        this.walletConnectConnectors = Array.from(connectors.values());
        Logger.log("launcher", "Wallet connect connectors:", this.walletConnectConnectors, this.walletConnectConnectors.length);
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.recentAppsSub = this.browserService.recentApps.subscribe(async () => {
      this.recentApps = await this.browserService.getRecentAppsWithInfo();
    });

    this.publicRedPacketsSubscription = this.packetService.publicPackets.subscribe(publicPackets => {
      // Keep only the packets not grabbed by the user yet
      this.publicRedPackets = publicPackets.filter(p => !this.packetService.packetAlreadyGrabbed(p.hash));
    });

    //Logger.log("launcher", "Launcher home screen will enter completed")
  }

  ionViewDidEnter() {
    Logger.log("launcher", "Launcher home screen did enter");

    this.globalStartupService.setStartupScreenReady();

    //Logger.log("launcher", "Launcher home screen did enter completed");

    /* console.log("TEST")
    this.ionSlides.changes.subscribe((comps: QueryList<IonSlide>) => {
      console.log("comps", comps);
    }); */
  }

  ionViewWillLeave() {
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
    if (this.vaultStatusSub) {
      this.vaultStatusSub.unsubscribe();
      this.vaultStatusSub = null;
    }
    if (this.walletConnectSub) {
      this.walletConnectSub.unsubscribe();
      this.walletConnectSub = null;
    }
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
      this.themeSubscription = null;
    }
    if (this.recentAppsSub) {
      this.recentAppsSub.unsubscribe();
      this.recentAppsSub = null;
    }
    if (this.publicRedPacketsSubscription) {
      this.publicRedPacketsSubscription.unsubscribe();
      this.publicRedPacketsSubscription = null;
    }

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.popover) {
      void this.popover.dismiss();
      this.popover = null;
    }
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
      this.activeWalletAddresses[networkWallet.id] = await networkWallet.getAddresses();
    }
  }

  async showNotifications() {
    this.modal = await this.modalCtrl.create({
      component: NotificationsPage,
      cssClass: 'running-modal',
      mode: 'ios',
    });
    this.modal.onDidDismiss().then(() => { this.modal = null; });
    await this.modal.present();
  }

  /************** Show App/Identity Options **************/
  async showOptions(ev: any) {
    Logger.log('Launcher', 'Opening options');

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      componentProps: {
      },
      cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'launcher-options-component' : 'launcher-options-component-dark',
      event: ev,
      translucent: false
    });
    void this.popover.onWillDismiss().then(() => {
      this.popover = null;
    });
    return await this.popover.present();
  }

  backupIdentity() {
    void this.nav.navigateTo("identitybackup", "/identity/backupdid");
  }

  showMyIdentity() {
    void this.nav.navigateTo("identity", '/identity/myprofile/home');
  }

  async signOut() {
    await this.appBackGroundService.stop();
    await this.didService.signOut();
  }

  public getSignedInIdentity(): IdentityEntry {
    return this.didService.signedIdentity;
  }

  getDateFromNow() {
    // return moment().format('dddd MMM Do') + ', ' + moment().format('LT');
    return moment().format('dddd, MMM Do');
  }

  /**
   * Opens the wallet connect sessions screen in settings
   */
  public showWalletConnectSessions() {
    void this.nav.navigateTo("settings", "/settings/walletconnect/sessions");
  }

  public someWalletConnectSessionsCanBeDisplayed(): boolean {
    if (!this.walletConnectConnectors || this.walletConnectConnectors.length == 0)
      return false;

    // Make sure the connectors are displayable, i.e. they have some peer metadata set
    return this.walletConnectConnectors.filter(c => {
      return c.peerMeta && c.peerMeta.icons && c.peerMeta.icons.length > 0;
    }).length > 0;
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

  public getShortRecentAppTitle(app: BrowsedAppInfo): string {
    if (app.title.length > 9)
      return app.title.substr(0, 9) + "...";
    else
      return app.title;
  }

  public getRecentAppNetworkIcon(app: BrowsedAppInfo): string {
    let network = this.walletNetworkService.getNetworkByKey(app.network);
    if (!network)
      return transparentPixelIconDataUrl();

    return network.logo;
  }

  public openDApps() {
    //this.browserService.clearRecentApps(); // TMP
    void this.globalNavService.navigateTo(App.DAPP_BROWSER, "/dappbrowser/home");
  }

  public openRecentApp(app: BrowsedAppInfo) {
    void this.browserService.openRecentApp(app);
  }

  public viewPublicRedPackets() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/home");
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
      cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'launcher-address-chooser-component' : 'launcher-address-chooser-component-dark',
      event: event,
      translucent: false
    });
    void this.popover.onWillDismiss().then((resp) => {
      this.popover = null;
    });
    return await this.popover.present();
  }
}
