import { Component, ViewChild } from '@angular/core';
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
import { CRCouncilVotingInitService } from './crcouncilvoting/services/init.service';
import { CRProposalVotingInitService } from './crproposalvoting/services/init.service';
import { DeveloperToolsInitService } from './developertools/services/init.service';
import { GlobalNavService } from './services/global.nav.service';

@Component({
    selector: 'app-root',
    template: '<ion-app><ion-router-outlet [swipeGesture]="false"></ion-router-outlet></ion-app>',
})
export class AppComponent {
    @ViewChild(IonRouterOutlet, { static: true }) routerOutlet: IonRouterOutlet;

    constructor(
        private platform: Platform,
        public modalCtrl: ModalController,
        public splashScreen: SplashScreen,
        public storage: GlobalStorageService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private didSessions: GlobalDIDSessionsService,
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
        private crCouncilVotingInitService: CRCouncilVotingInitService,
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

            this.screenOrientation.lock("portrait");

            this.setupBackKeyNavigation();

            // TODO screen.orientation.lock('portrait');
            await this.intentService.init();
            await this.didSessions.init();
            await this.language.init();

            // "DApps" initializations
            await this.didSessionsInitService.init();
            await this.launcherInitService.init();
            await this.scannerInitService.init();
            await this.hiveManagerInitService.init();
            await this.settingsInitService.init();
            await this.contactsInitService.init();
            await this.identityInitService.init();
            await this.walletInitService.init();
            await this.dposVotingInitService.init();
            await this.crCouncilVotingInitService.init();
            await this.crProposalVotingInitService.init();
            await this.developerToolsInitService.init();

            // Navigate to the right startup screen
            Logger.log("Global", "Navigating to start screen");
            let entry = await this.didSessions.getSignedInIdentity();
            if (entry != null) {
                Logger.log("Global", "An active DID exists, navigating to launcher home");
                this.globalNav.navigateHome();
                //this.navController.navigateRoot(['/identity/myprofile/home']);
            } else {
                Logger.log("Global", "No active DID, navigating to DID sessions");
                this.globalNav.navigateTo("didsessions", '/didsessions/pickidentity');
                // this.navController.navigateRoot(['/identity/myprofile']);
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
