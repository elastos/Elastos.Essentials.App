import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Native } from './native';

import { Config } from './config';
import { Util } from './util';
import { PopupProvider } from './popup';
import { AppIDService } from './appid.service';
import { UXService } from './ux.service';
import { Events } from './events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { IdentityIntent, AppIdCredIssueIdentityIntent, CredAccessIdentityIntent, IdentityIntentParams, SetHiveProviderIdentityIntent, CredImportIdentityIntent } from '../model/identity.intents';


@Injectable({
    providedIn: 'root'
})
export class IntentReceiverService {
    private receivedIntent: IdentityIntent<IdentityIntentParams>;

    constructor(
        public translate: TranslateService,
        public events: Events,
        private native: Native,
        private popup: PopupProvider,
        private appIDService: AppIDService,
        private uxService: UXService,
        private globalIntentService: GlobalIntentService
    ) {
    }

    async init() {
        this.globalIntentService.intentListener.subscribe((intent)=>{
            this.onReceiveIntent(intent);
        });
    }

    /**
     * From a full new-style action string such as https://did.elastos.net/credaccess,
     * returns the short old-style action "credaccess" for convenience.
     */
    private getShortAction(fullAction: string): string {
        let intentDomainRoot = "https://did.elastos.net/";
        return fullAction.replace(intentDomainRoot, "");
    }

    private async onReceiveIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        switch (this.getShortAction(intent.action)) {
            case "appidcredissue":
                Logger.log('identity', "Received appid credential issue intent request");
                if (this.checkAppIdCredIssueIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);

                    let appIdIssueIntent = intent as AppIdCredIssueIdentityIntent;

                    // Check if we can directly fullfil the request or not (silent intent).
                    // From inside trinity, as the runtime can ensure the app did, we can directly
                    // issue the credential most of the times. Native apps though require a UI
                    // confirmation.
                    this.appIDService.prepareNextRequest(appIdIssueIntent.intentId, appIdIssueIntent.params.appPackageId, appIdIssueIntent.params.appinstancedid, appIdIssueIntent.params.appdid);
                    if (await this.appIDService.applicationIDCredentialCanBeIssuedWithoutUI(appIdIssueIntent.params)) {
                        this.appIDService.generateAndSendApplicationIDCredentialIntentResponse(appIdIssueIntent.params);
                    }
                    else {
                        // We have to show a UI confirmation so let's do it.
                        this.native.setRootRouter("/appidcredissuerequest");
                    }
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credaccess":
                Logger.log('identity', "Received credential access intent request");
                if (this.checkCredAccessIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credaccessrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credimport":
                Logger.log('identity', "Received credential import intent request");
                if (this.checkCredImportIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credimportrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credissue":
                Logger.log('identity', "Received credential issue intent request");
                if (this.checkCredIssueIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credissuerequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "didsign":
                Logger.log('identity', "Received didsign intent request");
                if (this.checkSignIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/signrequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case 'promptpublishdid':
                // param is not required
                await this.uxService.loadIdentityAndShow(false);
                await this.native.setRootRouter('/myprofile');
                this.events.publish('did:promptpublishdid');
                break;
            case "registerapplicationprofile":
                Logger.log('identity', "Received register application profile intent request");
                if (this.checkRegAppProfileIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/regappprofilerequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "sethiveprovider":
                Logger.log('identity', "Received set hiveprovider intent request");
                if (this.checkSetHiveProviderIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/sethiveproviderrequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
        }
    }

    /**
     * Returns the received intent casted to the right type.
     */
    public getReceivedIntent<T extends IdentityIntent<IdentityIntentParams>>(): T {
        return this.receivedIntent as T;
    }

    /**
     * Removes the # part of an app id.
     * Ex: from "org.trinity.my.app#intent" to "org.trinity.my.app"
     */
    private extractRootAppId(fullAppId: string): string {
        let hashIndex = fullAppId.indexOf("#");
        if (hashIndex < 0)
            return fullAppId; // no hash found, return the raw value.

        return fullAppId.substring(0, hashIndex);
    }

    async showErrorAndExitFromIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        let errorMessage = "Sorry, there are invalid parameters in the request";
        errorMessage += "\n\n"+JSON.stringify(intent.params);

        await this.popup.ionicAlert("Action error", errorMessage, "Close");

        Logger.error('identity', errorMessage);

        await this.uxService.sendIntentResponse(intent.action, {}, intent.intentId);
    }

    private checkCredAccessIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking credaccess intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid credaccess parameters received. No params.", intent.params);
            return false;
        }

        let credAccessIntent: CredAccessIdentityIntent = intent;
        credAccessIntent.params.claims = credAccessIntent.params.claims || [];
        credAccessIntent.params.nonce = credAccessIntent.params.nonce || "no-nonce";
        credAccessIntent.params.realm = credAccessIntent.params.realm || "no-realm";
        credAccessIntent.jwtExpirationDays = credAccessIntent.jwtExpirationDays || 1;
        this.receivedIntent = credAccessIntent;

        return true;
    }

    private checkCredIssueIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking credissue intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid credissue parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.identifier)) {
            Logger.error('identity', "Invalid credissue parameters received. Empty identifier.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.properties)) {
            Logger.error('identity', "Invalid credissue parameters received. Empty properties.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.subjectdid)) {
            Logger.error('identity', "Invalid credissue parameters received. Empty subject DID.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.types) || intent.params.types.length == 0) {
            Logger.error('identity', "Invalid credissue parameters received. Empty types. You must provide at least one type for the credential.", intent.params);
            return false;
        }

        return true;
    }

    private checkAppIdCredIssueIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking appidcredissue intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid appidcredissue parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.appinstancedid)) {
            Logger.error('identity', "Invalid appidcredissue parameters received. Empty appinstancedid.", intent.params);
            return false;
        }

        this.receivedIntent = intent;

        return true;
    }

    private checkCredImportIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking credimport intent parameters", intent);
        if (Util.isEmptyObject(intent.params) || Util.isEmptyObject(intent.params.credentials)) {
            Logger.error('identity', "Invalid credimport parameters received. No params or empty credentials list.", intent.params);
            return false;
        }

        this.receivedIntent = intent;

        return true;
    }

    /**
     * Checks generic parameters in the received intent, and fills our requesting DApp object info
     * with intent info for later use.
     */
    private checkGenericIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent, allowEmptyParams: boolean = false): boolean {
        Logger.log('identity', "Checking generic intent parameters", intent);

        if (!allowEmptyParams && Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Intent parameters are empty");
            return false;
        }

        this.receivedIntent = intent;

        return true;
    }

    private checkRegAppProfileIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Check and get specific parameters for this intent
        if (!intent.params.identifier) {
            Logger.error('identity', "Missing profile 'identifier'.");
            return false;
        }

        if (!intent.params.connectactiontitle) {
            Logger.error('identity', "Missing profile 'connectactiontitle'.");
            return false;
        }

        return true;
    }

    private checkSignIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Check and get specific parameters for this intent
        if (!intent.params.data) {
            Logger.error('identity', "Missing 'data'.");
            return false;
        }

        return true;
    }

    private checkSetHiveProviderIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking SetHiveProvider intent parameters");

        if (Util.isEmptyObject(intent.params) || Util.isEmptyObject(intent.params.address)) {
            Logger.error('identity', "Invalid sethiveprovider parameters received. No params or empty address list.", intent.params);
            return false;
        }

        let setHiveProviderIntent: SetHiveProviderIdentityIntent = intent;
        setHiveProviderIntent.params.name = setHiveProviderIntent.params.name || '';
        this.receivedIntent = setHiveProviderIntent;

        return true;
    }

    private checkCreateDIDIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Nothing specific to do yet

        return true;
    }

    private checkImportMnemonicIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        return true;
    }

    private checkDeleteDIDIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        return true;
    }
}
