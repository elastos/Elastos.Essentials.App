import { Injectable, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import { StorageService } from './storage.service';
import { ThemeService } from './theme.service';
import { TranslateService } from '@ngx-translate/core';
import { ReceivedMessage } from 'src/app/TMP_STUBS';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';

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
                    this.checkSignedInThenGoTo("/hivemanager/pickprovider", receivedIntent);
                    break;
            }
        });
    }

    startDefaultScreen() {
        this.checkSignedInThenGoTo("/hivemanager/pickprovider");
    }

    async checkSignedInThenGoTo(nextRoute: string, routeQueryParams?: any) {
        console.log("Checking which default screen to start");

        // If not signed in, ask to sign in
        let signedInDID = await this.storage.getSignedInDID();
        if (!signedInDID) {
            console.log("No signed in DID, going to the sign in screen");
            this.postSignInRoute = nextRoute;
            this.postSignInQueryParams = routeQueryParams;
            this.navController.navigateRoot("signin");
        }
        else {
            // We know user's did string already? Then we go to the next route. It will check what needs to
            // be done for this user.
            console.log("DID already known. Going to the next screen");
            this.navController.navigateRoot(nextRoute, {
                queryParams: routeQueryParams
            });
        }
    }

    public goToPostSignInRoute() {
        this.navController.navigateRoot(this.postSignInRoute, {
            queryParams: this.postSignInQueryParams
        });
    }
}
