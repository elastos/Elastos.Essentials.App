import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    //private onGoingIntents = new Map<string, EssentialsIntentPlugin.ReceivedIntent>();
    private postSignInRoute: string = null;
    private postSignInQueryParams: any = null;

    constructor(
        private intents: GlobalIntentService,
        private nav: GlobalNavService
    ) { }

    init() {
        this.intents.intentListener.subscribe((receivedIntent) => {
            if (!receivedIntent)
                return;

            switch (receivedIntent.action) {
                // User is being asked to setup his vault storage.
                case "https://hive.elastos.net/setupvaultprompt":
                case "https://hive.web3essentials.io/setupvaultprompt":
                    void this.navigateTo("/hivemanager/pickprovider", receivedIntent);
                    break;
            }
        });
    }

    startDefaultScreen() {
        void this.navigateTo("/hivemanager/pickprovider");
    }

    navigateTo(nextRoute: string, routeQueryParams?: any) {
        Logger.log("HiveManager", "Navigating to", nextRoute);
        void this.nav.navigateTo(App.HIVE_MANAGER, nextRoute, { queryParams: routeQueryParams });
    }

    public goToPostSignInRoute() {
        void this.nav.navigateRoot(App.HIVE_MANAGER, this.postSignInRoute, {
            queryParams: this.postSignInQueryParams
        });
    }
}
