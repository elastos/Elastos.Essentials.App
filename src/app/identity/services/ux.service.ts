import { Injectable, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DIDService } from './did.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Events } from 'src/app/services/events.service';


enum MessageType {
    INTERNAL = 1,
    IN_RETURN = 2,
    IN_REFRESH = 3,

    EXTERNAL = 11,
    EX_LAUNCHER = 12,
    EX_INSTALL = 13,
    EX_RETURN = 14,
};

@Injectable({
    providedIn: 'root'
})
export class UXService {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public static instance: UXService = null;

    public modal: any = null;

    constructor(
        public translate: TranslateService,
        public events: Events,
        private didService: DIDService,
        private globalIntentService: GlobalIntentService
    ) {
        UXService.instance = this;
    }

    init() {
    }

    /**
     * This method defines which screen has to be displayed when the app start. This can be the default
     * no identity or current identity main screen, (defined by the didstoremanager), but the app is maybe
     * starting because we are receiving an intent.
     *
     * This method must be called only during the initial app start.
     */
    async computeAndShowEntryScreen() {
        Logger.log('identity', "Checking if there are pending intents");
        await this.loadIdentityAndShow();
    }

    public async loadIdentityAndShow(showEntryScreenAfterLoading = true) {
        // Load user's identity
        let couldLoad = await this.didService.loadGlobalIdentity();
        if (!couldLoad) {
            await this.didService.handleNull();
        }
        else {
            if (showEntryScreenAfterLoading) {
                // No intent was received at boot. So we go through the regular screens.
                await this.showEntryScreen();
            }
        }
    }

    async showEntryScreen() {
        await this.didService.displayDefaultScreen();
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }

    /**
     * In case the received intent contains a callback url or a redirect url, this means the response
     * will be sent out by the intent plugin or by wallet connect.
     * In this case we can't figure out the app DID context and the app did
     * has to be received in the intent request at first.
     */
    public isIntentResponseGoingOutsideEssentials(intentParams: any): boolean {
        if (!intentParams)
            return false; // Should not happen

        // TODO: WALLET CONNECT CHECKS !

        if (intentParams.callbackurl || intentParams.redirecturl) {
            Logger.log('identity', "isIntentResponseGoingOutsideElastos? YES - Params:", intentParams);
            return true;
        }
        else {
            Logger.log('identity', "isIntentResponseGoingOutsideElastos? NO - Params:", intentParams)
            return false;
        }
    }

    public sendIntentResponse(action, result, intentId, navigateBack = true): Promise<void> {
        return this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
    }
}
