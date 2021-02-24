import { Component } from '@angular/core';
import { Platform, ModalController, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { StorageService } from './services/storage.service';
import { ThemeService } from './services/theme.service';
import { LauncherService } from './launcher/services/launcher.service';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
})
export class AppComponent {
    constructor(
        private platform: Platform,
        public modalCtrl: ModalController,
        private navController: NavController,
        public splashScreen: SplashScreen,
        public storage: StorageService,
        public theme: ThemeService,
        private launcherService: LauncherService
    ) {
    }

    ngOnInit() {
        this.initializeApp();
    }

    async initializeApp() {
        this.platform.ready().then(async () => {
            console.log("Main app component initialization is starting");

            //screen.orientation.lock('portrait');

            await this.launcherService.init();

            console.log("Navigating to home screen")
            this.navController.navigateRoot(['/launcher/home']);
        });
    }
}
