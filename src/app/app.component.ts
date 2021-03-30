import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { Platform, ModalController, NavController, IonRouterOutlet } from '@ionic/angular';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { GlobalStorageService } from './services/global.storage.service';
import { GlobalThemeService } from './services/global.theme.service';
import { LauncherInitService } from './launcher/services/init.service';
import { DIDSessionsInitService } from './didsessions/services/init.service';
import { GlobalDIDSessionsService } from './services/global.didsessions.service';
import { ScannerInitService } from './scanner/services/init.service';
import { HiveManagerInitService } from './hivemanager/services/init.service';
import { SettingsInitService } from './settings/services/init.service';
import { GlobalLanguageService } from './services/global.language.service';
import { ContactsInitService } from './contacts/services/init.service';
import { IdentityInitService } from './identity/services/init.service';
import { WalletInitService } from './wallet/services/init.service'
import { Logger } from './logger';
import { GlobalIntentService } from './services/global.intent.service';
import { DPoSVotingInitService } from './dposvoting/services/init.service';
// import { CRCouncilVotingInitService } from './crcouncilvoting/services/init.service';
import { CRProposalVotingInitService } from './crproposalvoting/services/init.service';
import { DeveloperToolsInitService } from './developertools/services/init.service';
import { Direction, GlobalNavService } from './services/global.nav.service';
import { ElastosSDKHelper } from './helpers/elastossdk.helper';
import { InternalElastosConnector } from './model/internalelastosconnector';
import { connectivity } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { GlobalAppBackgroundService } from './services/global.appbackground.service';

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
        public storage: GlobalStorageService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private didSessions: GlobalDIDSessionsService,
        private globalAppBackgroundService: GlobalAppBackgroundService,
        private launcherInitService: LauncherInitService,
        private didSessionsInitService: DIDSessionsInitService,
        private scannerInitService: ScannerInitService,
        private hiveManagerInitService: HiveManagerInitService,
        private settingsInitService: SettingsInitService,
        private contactsInitService: ContactsInitService,
        private identityInitService: IdentityInitService,
        private walletInitService: WalletInitService,
        private dposVotingInitService: DPoSVotingInitService,
        private language: GlobalLanguageService,
        private intentService: GlobalIntentService,
        // private crCouncilVotingInitService: CRCouncilVotingInitService,
        private crProposalVotingInitService: CRProposalVotingInitService,
        private developerToolsInitService: DeveloperToolsInitService,
        private screenOrientation: ScreenOrientation
    ) {
    }

    ngOnInit() {
        this.initializeApp();
    }

    async initializeApp() {
        this.platform.ready().then(async () => {
            Logger.log("Global", "Main app component initialization is starting");

            // Force Essentials orientation to portrait only
            this.screenOrientation.lock("portrait");

            // Initialize our connectivity SDK helper (customize the connectivity SDK logger, storage layers)
            ElastosSDKHelper.init();

            // Use our own internal connector for the connectivity SDK
            let internalConnector = new InternalElastosConnector();
            connectivity.registerConnector(new InternalElastosConnector());
            connectivity.setActiveConnector(internalConnector.name);

            // Register Essentials' App DID to the connectivity SDK - For hive authentication flows.
            connectivity.setApplicationDID("did:elastos:ig1nqyyJhwTctdLyDFbZomSbZSjyMN1uor");

            // Catch android back key for navigation
            this.setupBackKeyNavigation();

            // TODO screen.orientation.lock('portrait');
            await this.intentService.init();
            await this.didSessions.init();
            await this.language.init();

            // "DApps" initializations
            this.globalAppBackgroundService.init();

            Logger.log("Global", "All awaited init services have been initialized");

            // Navigate to the right startup screen
            Logger.log("Global", "Navigating to start screen");
            let entry = await this.didSessions.getSignedInIdentity();
            if (entry != null) {
                Logger.log("Global", "An active DID exists, navigating to launcher home");

                // Make sure to load the active user theme preference before entering the home screen
                // to avoid blinking from light to dark modes while theme is fetched from preferences
                await this.theme.fetchThemeFromPreferences();

                // Navigate to home screen
                this.globalNav.navigateHome(Direction.NONE);
            } else {
                Logger.log("Global", "No active DID, navigating to DID sessions");

                // Navigate to DID creation
                this.globalNav.navigateTo("didsessions", '/didsessions/pickidentity');
            }
        });
    }

    /**
   * Listen to back key events. If the default router can go back, just go back.
   * Otherwise, exit the application.
   */
  setupBackKeyNavigation() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.globalNav.canGoBack()) {
        this.globalNav.navigateBack();
      } else {
        navigator["app"].exitApp();
      }
    });
  }
}
