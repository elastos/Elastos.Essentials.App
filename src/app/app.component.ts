import { Component } from '@angular/core';
import { Platform, ModalController, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { GlobalStorageService } from './services/global.storage.service';
import { GlobalThemeService } from './services/global.theme.service';
import { LauncherInitService } from './launcher/services/init.service';
import { DIDSessionsInitService } from './didsessions/services/init.service';
import { DIDSessionsService } from './services/didsessions.service';
import { ScannerInitService } from './scanner/services/init.service';
import { HiveManagerInitService } from './hivemanager/services/init.service';
import { SettingsInitService } from './settings/services/init.service';
import { GlobalLanguageService } from './services/global.language.service';
import { ContactsInitService } from './contacts/services/init.service';

@Component({
    selector: 'app-root',
    template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
})
export class AppComponent {
    constructor(
        private platform: Platform,
        public modalCtrl: ModalController,
        private navController: NavController,
        public splashScreen: SplashScreen,
        public storage: GlobalStorageService,
        public theme: GlobalThemeService,
        private didSessions: DIDSessionsService,
        private launcherInitService: LauncherInitService,
        private didSessionsInitService: DIDSessionsInitService,
        private scannerInitService: ScannerInitService,
        private hiveInitService: HiveManagerInitService,
        private settingsInitService: SettingsInitService,
        private contactsInitService: ContactsInitService,
        private language: GlobalLanguageService
    ) {
    }

    ngOnInit() {
        this.initializeApp();
    }

    async initializeApp() {
        this.platform.ready().then(async () => {
            console.log("Main app component initialization is starting");

            // TODO screen.orientation.lock('portrait');

            await this.didSessions.init();
            await this.language.init();
            await this.didSessionsInitService.init();
            await this.launcherInitService.init();
            await this.scannerInitService.init();
            await this.hiveInitService.init();
            await this.settingsInitService.init();
            await this.contactsInitService.init();

            // Navigate to the right startup screen
            console.log("Navigating to start screen");
            let entry = await this.didSessions.getSignedInIdentity();
            if (entry != null) {
                console.log("An active DID exists, navigating to launcher home");
                this.navController.navigateRoot(['/launcher/home']);
            } else {
                console.log("No active DID, navigating to DID sessions");
                this.navController.navigateRoot(['/didsessions/pickidentity']);
                //this.navController.navigateRoot(['/launcher/home']);
            }
        });
    }
}
