import { Injectable } from '@angular/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

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
    ) {
    }

    init() {
        this.intents.intentListener.subscribe((receivedIntent)=>{
            if (!receivedIntent)
                return;

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
        this.nav.navigateTo(App.HIVE_MANAGER, nextRoute, { queryParams: routeQueryParams });
    }

    public goToPostSignInRoute() {
        this.nav.navigateRoot(App.HIVE_MANAGER, this.postSignInRoute, {
            queryParams: this.postSignInQueryParams
        });
    }
}
