import { Injectable, NgZone } from '@angular/core';
import { NavigationExtras } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalIntentService } from '../../services/global.intent.service';


@Injectable({
    providedIn: 'root'
})
export class IntentService {
    private intentRequest: EssentialsIntentPlugin.ReceivedIntent;

    constructor(
        private globalNav: GlobalNavService,
        private ngZone: NgZone,
        private translate: TranslateService,
        private globalIntentService: GlobalIntentService,
    ) {
    }

    /**
     * From a full new-style action string such as https://essentials.web3essentials.io/app
     * returns the short old-style action "app" for convenience.
     */
    private getShortAction(fullAction: string): string {
        let shortAction = fullAction.replace("https://scanner.elastos.net/", ""); // backward compatibility
        shortAction = shortAction.replace("https://scanner.web3essentials.io/", ""); // new intent urls
        return shortAction;
    }

    public init() {
        /*Logger.log('Scanner', "Checking if there are pending intents");
        essentialsIntentManager.hasPendingIntent((hasPendingIntent: boolean)=>{
            if (hasPendingIntent) {
                // Do nothing, the intent listener will show the appropriate screen.
                Logger.log('Scanner', "There are some pending intents.");
            }
            else {
                Logger.log('Scanner', "No pending intent.");

                // No intent was received at boot. So we go through the regular screens.
                this.showScanScreen(false);
            }
        }, (err: string)=>{
            Logger.log('Scanner', err);

            // Error while checking - fallback to default behaviour
            this.showScanScreen(false);
        });*/


        // Listen to incoming intent events.
        this.globalIntentService.intentListener.subscribe((receivedIntent) => {
            if (!receivedIntent)
                return;

            let shortAction = this.getShortAction(receivedIntent.action);
            if (shortAction == "scanqrcode") {
                Logger.log('Scanner', "Received intent for scanner:", receivedIntent);

                // Remember the received intent for later use
                this.intentRequest = receivedIntent;

                // Show the scan screen
                this.showScanScreen(true);
            }
        });
    }

    private showScanScreen(fromIntentRequest: boolean) {
        const props: NavigationExtras = {
            state: {
                fromIntent: fromIntentRequest
            }
        }

        this.ngZone.run(() => {
            void this.globalNav.navigateRoot("/scanner", "/scanner/scan", props);
        });
    }

    public sendScanQRCodeIntentResponse(scannedContent: string, navigateBack = true): Promise<void> {
        Logger.log('Scanner', "Sending scanqrcode intent response");

        return this.globalIntentService.sendIntentResponse({
            scannedContent: scannedContent
        }, this.intentRequest.intentId as number, navigateBack);
    }
}
