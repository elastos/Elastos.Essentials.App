import { Component } from '@angular/core';
import { Platform, ModalController, NavController } from '@ionic/angular';
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

@Component({
    selector: 'app-root',
    template: '<ion-app><ion-router-outlet [swipeGesture]="false"></ion-router-outlet></ion-app>',
})
export class AppComponent {
    constructor(
        private platform: Platform,
        public modalCtrl: ModalController,
        private navController: NavController,
        public splashScreen: SplashScreen,
        public storage: GlobalStorageService,
        public theme: GlobalThemeService,
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
        private intentService: GlobalIntentService
    ) {
    }

    ngOnInit() {
        this.initializeApp();
    }

    async initializeApp() {
        this.platform.ready().then(async () => {
            Logger.log("Global", "Main app component initialization is starting");

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

            // Navigate to the right startup screen
            Logger.log("Global", "Navigating to start screen");
            let entry = await this.didSessions.getSignedInIdentity();
            if (entry != null) {
                Logger.log("Global", "An active DID exists, navigating to launcher home");
                this.navController.navigateRoot(['/launcher/home']);
            } else {
                Logger.log("Global", "No active DID, navigating to DID sessions");
                this.navController.navigateRoot(['/didsessions/pickidentity']);
                //this.navController.navigateRoot(['/launcher/home']);
            }
        });
    }
}
