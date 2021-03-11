import { Injectable, NgZone } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from '../../services/global.intent.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Injectable({
    providedIn: 'root'
})
export class IntentService {
    private intentRequest: EssentialsIntentPlugin.ReceivedIntent;

    constructor(
        private platform: Platform,
        private navCtrl: NavController,
        private router: Router,
        private ngZone: NgZone,
        private translate: TranslateService,
        private globalIntentService: GlobalIntentService
    ) {
    }

    public async init() {
        /*console.log("Checking if there are pending intents");
        essentialsIntent.hasPendingIntent((hasPendingIntent: boolean)=>{
            if (hasPendingIntent) {
                // Do nothing, the intent listener will show the appropriate screen.
                console.log("There are some pending intents.");
            }
            else {
                console.log("No pending intent.");

                // No intent was received at boot. So we go through the regular screens.
                this.showScanScreen(false);
            }
        }, (err: string)=>{
            console.error(err);

            // Error while checking - fallback to default behaviour
            this.showScanScreen(false);
        });*/


        // Listen to incoming intent events.
        this.globalIntentService.intentListener.subscribe((intent)=>{
            if (intent.action == "https://scanner.elastos.net/scanqrcode") {
                console.log("Received intent for scanner:", intent);

                // Remember the received intent for later use
                this.intentRequest = intent;

                // Show the scan screen
                this.showScanScreen(true);
            }
        });
    }

    private showScanScreen(fromIntentRequest: boolean) {
        this.navCtrl.setDirection('root');
        let queryParams = {
            fromIntent: fromIntentRequest
        };

        this.ngZone.run(() => {
            this.router.navigate(["/scanner/scan"], {
                queryParams: queryParams
            });
        });
    }

    public sendScanQRCodeIntentResponse(scannedContent: string): Promise<void> {
        console.log("Sending scanqrcode intent response");

        return essentialsIntent.sendIntentResponse({
            scannedContent: scannedContent
        }, this.intentRequest.intentId as number);
    }
}
