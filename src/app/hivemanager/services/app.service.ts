import { Injectable, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import { StorageService } from './storage.service';
import { ThemeService } from './theme.service';
import { TranslateService } from '@ngx-translate/core';
import { ReceivedMessage } from 'src/app/TMP_STUBS';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    //private onGoingIntents = new Map<string, AppManagerPlugin.ReceivedIntent>();
    private postSignInRoute: string = null;
    private postSignInQueryParams: any = null;

    constructor(
        private navController: NavController,
        private storage: StorageService,
        private zone: NgZone,
        private theme: ThemeService,
        private translate: TranslateService,
        private prefs: GlobalPreferencesService,
        private intents: GlobalIntentService
    ) {
    }

    init() {
        this.intents.intentListener.subscribe((receivedIntent)=>{
            switch (receivedIntent.action) {
                // User is being asked to setup his vault storage.
                case "https://hive.elastos.net/setupvaultprompt":
                    this.navigateTo("/hivemanager/pickprovider", receivedIntent);
                    break;
            }
        });
    }

    startDefaultScreen() {
        this.navigateTo("/hivemanager/pickprovider");
    }

    async navigateTo(nextRoute: string, routeQueryParams?: any) {
        Logger.log("HiveManager", "Navigating to", nextRoute);

        this.navController.navigateRoot(nextRoute, {
            queryParams: routeQueryParams
        });
    }

    public goToPostSignInRoute() {
        this.navController.navigateRoot(this.postSignInRoute, {
            queryParams: this.postSignInQueryParams
        });
    }
}
