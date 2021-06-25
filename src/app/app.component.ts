import { Component, ViewChild } from '@angular/core';
import { Platform, IonRouterOutlet } from '@ionic/angular';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { GlobalStorageService } from './services/global.storage.service';
import { GlobalThemeService } from './services/global.theme.service';
import { GlobalDIDSessionsService } from './services/global.didsessions.service';
import { GlobalLanguageService } from './services/global.language.service';
import { Logger } from './logger';
import { GlobalIntentService } from './services/global.intent.service';
import { Direction, GlobalNavService } from './services/global.nav.service';
import { ElastosSDKHelper } from './helpers/elastossdk.helper';
import { InternalElastosConnector } from './model/internalelastosconnector';
import { connectivity } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { GlobalAppBackgroundService } from './services/global.appbackground.service';
import { GlobalNotificationsService } from './services/global.notifications.service';
import { GlobalPublicationService } from './services/global.publication.service';
import { GlobalWalletConnectService } from './services/global.walletconnect.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { GlobalJsonRPCService } from './services/global.jsonrpc.service';
import { GlobalHiveService } from './services/global.hive.service';

@Component({
    selector: 'app-root',
    template: '<ion-app><ion-router-outlet [swipeGesture]="false"></ion-router-outlet></ion-app>',
    // BPI 20200322: With the onpush detection strategy angular seems to work 5 to 10x faster for rendering
    // But this created some refresh bugs in some components, as we need to manually push more changes
    // To be continued. NOTE: Comment out the line below if too many problems for now!
    //changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
    @ViewChild(IonRouterOutlet, { static: true }) routerOutlet: IonRouterOutlet;

    constructor(
        private platform: Platform,
        public splashScreen: SplashScreen,
        private statusBar: StatusBar,
        public storage: GlobalStorageService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private didSessions: GlobalDIDSessionsService,
        private globalAppBackgroundService: GlobalAppBackgroundService,
        private language: GlobalLanguageService,
        private intentService: GlobalIntentService,
        private jsonRPCService: GlobalJsonRPCService,
        private screenOrientation: ScreenOrientation,
        private notificationsService: GlobalNotificationsService,
        private publicationService: GlobalPublicationService,
        private globalHiveService: GlobalHiveService,
        private walletConnect: GlobalWalletConnectService
    ) {
    }

    ngOnInit() {
        this.initializeApp();
    }

    initializeApp() {
        void this.platform.ready().then(async () => {
            Logger.log("Global", "Main app component initialization is starting");

            // Force Essentials orientation to portrait only
            void this.screenOrientation.lock("portrait");

            // Must do it in ios, otherwise the titlebar and status bar will overlap.
            this.statusBar.overlaysWebView(false);
            this.statusBar.backgroundColorByHexString("#ff000000");

            // Initialize our connectivity SDK helper (customize the connectivity SDK logger, storage layers)
            ElastosSDKHelper.init();

            // Use our own internal connector for the connectivity SDK
            let internalConnector = new InternalElastosConnector();
            await connectivity.registerConnector(new InternalElastosConnector());
            await connectivity.setActiveConnector(internalConnector.name);

            // Register Essentials' App DID to the connectivity SDK - For hive authentication flows.
            connectivity.setApplicationDID("did:elastos:ig1nqyyJhwTctdLyDFbZomSbZSjyMN1uor");

            // Catch android back key for navigation
            this.setupBackKeyNavigation();

            screen.orientation.lock('portrait');

            // Initialize mandatory services
            this.theme.init();
            await this.language.init();
            await this.notificationsService.init();
            await this.intentService.init();
            await this.publicationService.init();
            await this.walletConnect.init();
            await this.jsonRPCService.init();
            await this.globalHiveService.init();

            // "DApps" initializations
            await this.globalAppBackgroundService.init();

            // TMP TEST
            //await this.publicationService.publishDIDOnAssist("", {}, "", true);

            Logger.log("Global", "All awaited init services have been initialized");

            // This method will sign in, so it must come last.
            await this.didSessions.init();

            // Navigate to the right startup screen
            Logger.log("Global", "Navigating to start screen");
            let entry = await this.didSessions.getSignedInIdentity();
            if (entry != null) {
                Logger.log("Global", "An active DID exists, navigating to launcher home");

                // Make sure to load the active user theme preference before entering the home screen
                // to avoid blinking from light to dark modes while theme is fetched from preferences
                await this.theme.fetchThemeFromPreferences();

                // Navigate to home screen
                await this.globalNav.navigateHome(Direction.NONE);
            } else {
                Logger.log("Global", "No active DID, navigating to DID sessions");

                // Navigate to DID creation
                await this.globalNav.navigateTo("didsessions", '/didsessions/pickidentity');
                // await this.globalNav.navigateTo("didsessions", '/didsessions/chooseimporteddid');
            }

            // Now that all services are initialized and the initial screen is shown,
            // we can start listening to external intents.
            // All the subscribers may now be listening to received intents
            await this.intentService.listen();
        });
    }

  /**
   * Listen to back key events. If the default router can go back, just go back.
   * Otherwise, exit the application.
   */
  setupBackKeyNavigation() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.globalNav.canGoBack()) {
        void this.globalNav.navigateBack();
      } else {
        navigator["app"].exitApp();
      }
    });
  }
}
