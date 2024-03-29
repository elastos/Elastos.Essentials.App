import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { DappBrowserService } from './dappbrowser.service';

@Injectable({
    providedIn: 'root'
})
export class IntentReceiverService {
    public static instance: IntentReceiverService;

    constructor(
        public translate: TranslateService,
        private native: GlobalNativeService,
        private globalIntentService: GlobalIntentService,
        private globalPopupService: GlobalPopupService
    ) {
        IntentReceiverService.instance = this;
    }

    init() {
        this.globalIntentService.intentListener.subscribe((receivedIntent) => {
            if (!receivedIntent)
                return;

            void this.onReceiveIntent(receivedIntent);
        });
    }

    /**
     * From a full new-style action string such as https://elink.web3essentials.io/credaccess,
     * returns the short old-style action "credaccess" for convenience.
     */
    private getShortAction(fullAction: string): string {
        let shortAction = fullAction.replace("https://elink.elastos.net/", ""); // backward compatibility
        shortAction = shortAction.replace("https://elink.web3essentials.io/", ""); // new intent urls
        return shortAction;
    }

    private onReceiveIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        switch (this.getShortAction(intent.action)) {
            // https://.../open?u=https://filda.io
            case "open":
                Logger.log('dappbrowser', "Received open url intent request");
                if (intent.params && intent.params.u) {
                    let url = intent.params.u;
                    void this.handleOpenUrlRequest(intent, url);
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent("url is missing", intent, { urlOpened: false });
                }
                break;

        }
    }

    private async handleOpenUrlRequest(intent: EssentialsIntentPlugin.ReceivedIntent, url: string) {
        // Close any active browser so we can see the popup
        void DappBrowserService.instance.close("goToLauncher");

        let confirmed = await this.globalPopupService.ionicConfirm("dappbrowser.open-external-url-title", url, 'common.continue', 'common.close');
        if (confirmed) {
            // Confirmed, we can open the url
            void DappBrowserService.instance.open(url);
            await this.globalIntentService.sendIntentResponse({ urlOpened: true }, intent.intentId, false);
        }
        else {
            // Refused, send intent response and do nothing
            await this.globalIntentService.sendIntentResponse({ urlOpened: false }, intent.intentId, false);
        }
    }

    async showErrorAndExitFromIntent(reason: string, intent: EssentialsIntentPlugin.ReceivedIntent, intentResponse = {}) {
        let errorMessage = "This request cannot be processed: " + reason;
        errorMessage += "\n\n" + JSON.stringify(intent.params);

        await this.native.genericAlert(errorMessage, "Action error");

        Logger.error('dappbrowser', errorMessage);

        await this.globalIntentService.sendIntentResponse(intentResponse, intent.intentId, false);
    }
}
