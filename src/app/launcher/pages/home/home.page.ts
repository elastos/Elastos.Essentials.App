import { Component, NgZone, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { IonSlides, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { AppmanagerService } from '../../services/appmanager.service';
import { DIDManagerService } from '../../services/didmanager.service';
import { WidgetContainerComponent } from '../../widgets/base/widget-container/widget-container.component';
import { WidgetPluginsService } from '../../widgets/services/plugin.service';
import { WidgetsService } from '../../widgets/services/widgets.service';
import { NotificationsPage } from '../notifications/notifications.page';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild('widgetsslides', { static: true }) widgetsSlides: IonSlides;
  @ViewChildren(WidgetContainerComponent) widgetContainersList: QueryList<WidgetContainerComponent>;

  private widgetContainers: WidgetContainerComponent[] = [];

  private popover: HTMLIonPopoverElement = null;
  private modal: any = null;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private themeSubscription: Subscription = null; // Subscription to theme change
  private widgetsEditionModeSub: Subscription = null;

  public widgetsSlidesOpts = {
    autoHeight: true,
    spaceBetween: 10,
    initialSlide: 1
  };
  public activeScreenIndex = 1;
  public editingWidgets = false;

  constructor(
    public toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    public translate: TranslateService,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    public splashScreen: SplashScreen,
    public appService: AppmanagerService,
    public didService: DIDManagerService,
    private modalCtrl: ModalController,
    private zone: NgZone,
    public walletUIService: UiService,
    private globalNetworksService: GlobalNetworksService,
    private globalStartupService: GlobalStartupService,
    private globalNavService: GlobalNavService,
    private widgetsService: WidgetsService,
    private widgetPluginsService: WidgetPluginsService // init
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
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

    //this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "home",
      iconPath: BuiltInIcon.HOME
    });
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "notifications",
      iconPath: BuiltInIcon.NOTIFICATIONS
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case 'home':
          this.widgetsService.exitEditionMode(); // Exit edition mode if needed
          void this.widgetsSlides.slideTo(1); // re-center on the middle screen
          return;
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
      this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
        key: "scan",
        iconPath: BuiltInIcon.SCAN
      });
      this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
        key: "settings",
        iconPath: BuiltInIcon.SETTINGS
      });
    });

    if (this.didService.signedIdentity) { // Should not happen, just in case - for ionic hot reload
      this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
        switch (template) {
          case MAINNET_TEMPLATE:
            //this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
            this.titleBar.setTitle(null);
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

    this.widgetsEditionModeSub = this.widgetsService.editionMode.subscribe(editionMode => {
      this.editingWidgets = editionMode;

      // Lock the slider during edition to avoid horizontal scrolling
      void this.widgetsSlides.lockSwipes(editionMode);

      // When the mode changes to edition, the active slide content will get higher
      // as new content is shown. We need to wait for this content (invisible widgets) to be shown then
      // force a recomputation of the slider height, otherwiser the user can't scroll down.
      setTimeout(() => {
        void this.widgetsSlides.updateAutoHeight(0);
      }, 500);
    });

    //Logger.log("launcher", "Launcher home screen will enter completed")

    //void this.widgetsService.onLauncherHomeViewWillEnter();
  }

  ionViewDidEnter() {
    Logger.log("launcher", "Launcher home screen did enter");

    this.globalStartupService.setStartupScreenReady();

    //console.log(this.widgetContainers)
    this.widgetContainers = this.widgetContainersList.toArray();
  }

  ionViewWillLeave() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
      this.themeSubscription = null;
    }

    if (this.widgetsEditionModeSub) {
      this.widgetsEditionModeSub.unsubscribe();
      this.widgetsEditionModeSub = null;
    }

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.popover) {
      void this.popover.dismiss();
      this.popover = null;
    }

    //void this.widgetsService.onLauncherHomeViewWillLeave();
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

  public toggleEditWidgets() {
    this.widgetsService.toggleEditionMode();
  }

  public addWidget() {
    // Enter edition mode
    this.widgetsService.enterEditionMode();

    // Pick a widget
    this.widgetContainers[this.activeScreenIndex].addWidget();
  }

  public async onSlideChange() {
    this.activeScreenIndex = await this.widgetsSlides.getActiveIndex();
  }
}
