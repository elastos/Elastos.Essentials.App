import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { IonContent, IonSlides, ModalController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import {
  BuiltInIcon,
  TitleBarIcon,
  TitleBarIconSlot,
  TitleBarMenuItem,
  TitleBarNavigationMode
} from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalLightweightService } from 'src/app/services/global.lightweight.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import {
  GlobalNetworksService,
  LRW_TEMPLATE,
  MAINNET_TEMPLATE,
  TESTNET_TEMPLATE
} from 'src/app/services/global.networks.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { AppmanagerService } from '../../services/appmanager.service';
import { DIDManagerService } from '../../services/didmanager.service';
import { NotificationManagerService } from '../../services/notificationmanager.service';
import { WidgetContainerComponent } from '../../widgets/base/widget-container/widget-container.component';
import { WidgetsServiceEvents } from '../../widgets/services/widgets.events';
import { WidgetsService } from '../../widgets/services/widgets.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(IonContent, { static: true }) ionContent: IonContent;
  @ViewChild('widgetsslides', { static: false }) widgetsSlides: IonSlides | undefined;
  @ViewChildren(WidgetContainerComponent) widgetContainersList: QueryList<WidgetContainerComponent>;

  private widgetContainers: WidgetContainerComponent[] = [];

  private popover: HTMLIonPopoverElement = null;
  private modal: any = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private themeSubscription: Subscription = null; // Subscription to theme change
  private themeColorSubscription: Subscription = null;
  private widgetsEditionModeSub: Subscription = null;

  public showSwipeIndicator = false; // Whether to show the swipe animation or not (first time only for new identities)

  public widgetsSlidesOpts = {
    autoHeight: true,
    spaceBetween: 10,
    initialSlide: 1 // Start at middle slide (index 1)
  };
  public slidesShown = false;
  public activeScreenIndex: number;
  public editingWidgets = false;
  public lightweightMode;
  private hasUserInteractedWithSlides = false;

  constructor(
    public toastCtrl: ToastController,
    public translate: TranslateService,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    public didService: DIDManagerService,
    private modalCtrl: ModalController,
    public walletUIService: UiService,
    private globalNetworksService: GlobalNetworksService,
    private globalNavService: GlobalNavService,
    private widgetsService: WidgetsService,
    private launcherNotificationsService: NotificationManagerService,
    private globalPrefs: GlobalPreferencesService,
    private lightweightService: GlobalLightweightService
  ) {
    // Read lightweight mode synchronously from the service
    this.lightweightMode = this.lightweightService.getCurrentLightweightMode();

    // Register containers based on lightweight mode
    if (!this.lightweightMode) {
      this.widgetsService.registerContainer('left');
      this.widgetsService.registerContainer('main');
      this.widgetsService.registerContainer('right');
      this.activeScreenIndex = 1;
    } else {
      // Lightweight mode: only one screen
      this.widgetsService.registerContainer('main');
      this.activeScreenIndex = 0;
    }
  }

  ngOnInit() {
    this.launcherNotificationsService.init();

    void this.storage
      .getSetting(
        DIDSessionsStore.signedInDIDString,
        NetworkTemplateStore.networkTemplate,
        'launcher',
        'swipanimationshown',
        false
      )
      .then(swipeAnimationShown => {
        this.showSwipeIndicator = !swipeAnimationShown;
      });
  }

  ionViewWillEnter() {
    Logger.log('launcher', 'Launcher home screen will enter');
    /*  setTimeout(()=>{
       const notification = {
         key: 'storagePlanExpiring',
         title: 'Storage Plan Expiring',
         message: 'You have a storage plan expiring soon. Please renew your plan before the expiration time.',
         app: App.WALLET
       };
       this.globalNotifications.sendNotification(notification);
     }, 2000); */

    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: 'home',
      iconPath: BuiltInIcon.HOME
    });
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: 'notifications',
      iconPath: BuiltInIcon.NOTIFICATIONS
    });
    this.titleBar.addOnItemClickedListener(
      (this.titleBarIconClickedListener = icon => {
        switch (icon.key) {
          case 'home':
            this.widgetsService.exitEditionMode(); // Exit edition mode if needed
            if (this.widgetsSlides && !this.lightweightMode) {
              void this.widgetsSlides.slideTo(1); // re-center on the middle screen
            }
            return;
          case 'notifications':
            void this.showNotifications();
            break;
          case 'scan':
            void this.globalNavService.navigateTo(App.SCANNER, '/scanner/scan');
            break;
          case 'settings':
            void this.globalNavService.navigateTo(App.SETTINGS, '/settings/menu');
            break;
        }
      })
    );

    /* if (this.theme.darkMode) {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    } else {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.DARK);
    } */

    this.themeSubscription = this.theme.activeTheme.subscribe(theme => {
      this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
        key: 'scan',
        iconPath: BuiltInIcon.SCAN
      });
      this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
        key: 'settings',
        iconPath: BuiltInIcon.SETTINGS
      });
    });

    if (this.didService.signedIdentity) {
      // Should not happen, just in case - for ionic hot reload
      this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
        switch (template) {
          case MAINNET_TEMPLATE:
            this.titleBar.setTitle(null);
            break;
          case TESTNET_TEMPLATE:
            this.titleBar.setTitle('TEST NET Active');
            break;
          case LRW_TEMPLATE:
            this.titleBar.setTitle('CR Private Net Active');
            break;
        }
      });
    }

    this.widgetsEditionModeSub = WidgetsServiceEvents.editionMode.subscribe(editionMode => {
      this.editingWidgets = editionMode;

      // Only handle slides logic if not in lightweight mode
      if (this.widgetsSlides && !this.lightweightMode) {
        // Lock the slider during edition to avoid horizontal scrolling
        void this.widgetsSlides.lockSwipes(editionMode);

        // When the mode changes to edition, the active slide content will get higher
        // as new content is shown. We need to wait for this content (invisible widgets) to be shown then
        // force a recomputation of the slider height, otherwiser the user can't scroll down.
        setTimeout(() => {
          void this.widgetsSlides.updateAutoHeight(0);
        }, 500);
      }
    });

    //Logger.log("launcher", "Launcher home screen will enter completed")

    //void this.widgetsService.onLauncherHomeViewWillEnter();

    // Initialize slides visibility
    this.initializeSlidesVisibility();
  }

  ionViewDidEnter() {
    Logger.log('launcher', 'Launcher home screen did enter');

    GlobalStartupService.instance.setStartupScreenReady();

    //console.log(this.widgetContainers)
    this.widgetContainers = this.widgetContainersList.toArray();

    // Fallback: ensure slides are shown in non-lightweight mode
    if (!this.lightweightMode && !this.slidesShown) {
      console.warn('Slides not shown in ionViewDidEnter, forcing visibility');
      this.initializeSlidesVisibility();
    }
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
    this.modal = await this.launcherNotificationsService.showNotifications(() => {
      this.modal = null;
    });
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

  /**
   * Initialize slides visibility
   */
  private initializeSlidesVisibility() {
    if (this.lightweightMode) {
      // In lightweight mode, mark slides as shown since we don't use slides
      this.slidesShown = true;
      return;
    }

    if (this.slidesShown) {
      console.log('Slides already shown, returning');
      return; // Already initialized
    }

    // With initialSlide: 1, slides should start at the correct position
    // Just show them after a brief delay to ensure they're properly initialized
    setTimeout(() => {
      this.slidesShown = true;
      console.log('Slides marked as shown after timeout');
    }, 50);
  }

  public onSlideTouchEnd() {
    console.log('onSlideTouchEnd: user has interacted with slides');
    this.hasUserInteractedWithSlides = true;
    if (this.showSwipeIndicator) {
      console.log('Hiding swipe indicator due to user touch end');
      this.showSwipeIndicator = false;
      void this.storage.setSetting(
        DIDSessionsStore.signedInDIDString,
        NetworkTemplateStore.networkTemplate,
        'launcher',
        'swipanimationshown',
        true
      );
    }
  }

  public async onSlideChange(evt) {
    console.log(
      'onSlideChange called, lightweightMode:',
      this.lightweightMode,
      'showSwipeIndicator:',
      this.showSwipeIndicator
    );
    console.log('widgetsSlides exists:', !!this.widgetsSlides);

    // Only handle slide changes if not in lightweight mode
    if (!this.lightweightMode) {
      console.log('Inside slides handling block');

      // Ignore initial non-user slide changes (from init)
      if (!this.hasUserInteractedWithSlides) {
        console.log('Ignoring slide change because user has not interacted yet');
        return;
      }

      // Try to get widgetsSlides if available
      if (this.widgetsSlides) {
        this.activeScreenIndex = await this.widgetsSlides.getActiveIndex();
        console.log('Active screen index:', this.activeScreenIndex);
        //void this.ionContent.scrollToTop(500);

        void this.widgetsSlides.update();
      } else {
        console.log('widgetsSlides not available yet, but still handling swipe indicator');
      }

      // User has swiped at least once so he knows. We can hide the swipe indicator and remember this.
      // Hide indicator on any slide change (after user interaction)
      if (this.showSwipeIndicator) {
        console.log('Hiding swipe indicator due to slide change (after user interaction)');
        this.showSwipeIndicator = false;

        void this.storage.setSetting(
          DIDSessionsStore.signedInDIDString,
          NetworkTemplateStore.networkTemplate,
          'launcher',
          'swipanimationshown',
          true
        );
      } else {
        console.log('showSwipeIndicator is false, not hiding');
      }
    } else {
      console.log('Not inside slides handling block - lightweightMode:', this.lightweightMode);
    }
  }
}
