import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Native } from './native';

import { Config } from './config';
import { Util } from './util';
import { PopupProvider } from './popup';
import { AppIDService } from './appid.service';
import { UXService } from './ux.service';
import { Events } from './events.service';
import { ReceivedIntent, TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { GlobalIntentService } from 'src/app/services/global.intent.service';

@Injectable({
    providedIn: 'root'
})
export class IntentReceiverService {
    private appIsLaunchingFromIntent = false; // Is the app starting because of an intent request?

    constructor(
        public translate: TranslateService,
        public events: Events,
        private native: Native,
        private popup: PopupProvider,
        private appIDService: AppIDService,
        private uxService: UXService,
        private appManager: TemporaryAppManagerPlugin,
        private intentService: GlobalIntentService
    ) {
    }

    async init() {
        this.intentService.intentListener.subscribe((intent)=>{
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

    async onReceiveIntent(intent: ReceivedIntent) {
        switch (this.getShortAction(intent.action)) {
            case "appidcredissue":
                console.log("Received appid credential issue intent request");
                if (this.checkAppIdCredIssueIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);

                    // Check if we can directly fullfil the request or not (silent intent).
                    // From inside trinity, as the runtime can ensure the app did, we can directly
                    // issue the credential most of the times. Native apps though require a UI
                    // confirmation.
                    this.appIDService.prepareNextRequest(Config.requestDapp.intentId, Config.requestDapp.appPackageId, Config.requestDapp.appinstancedid, Config.requestDapp.appdid);
                    if (await this.appIDService.applicationIDCredentialCanBeIssuedWithoutUI(Config.requestDapp.params)) {
                        this.appIDService.generateAndSendApplicationIDCredentialIntentResponse(Config.requestDapp.params);
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
                console.log("Received credential access intent request");
                if (this.checkCredAccessIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credaccessrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credimport":
                console.log("Received credential import intent request");
                if (this.checkCredImportIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credimportrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credissue":
                console.log("Received credential issue intent request");
                if (this.checkCredIssueIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/credissuerequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "didsign":
                console.log("Received didsign intent request");
                if (this.checkSignIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/signrequest");
                }
                else {
                    console.error("Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case 'promptpublishdid':
                this.appIsLaunchingFromIntent = true;
                // param is not required
                await this.uxService.loadIdentityAndShow(false);
                await this.native.setRootRouter('/myprofile');
                this.events.publish('did:promptpublishdid');
                break;
            case "registerapplicationprofile":
                console.log("Received register application profile intent request");
                if (this.checkRegAppProfileIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/regappprofilerequest");
                }
                else {
                    console.error("Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "sethiveprovider":
                console.log("Received set hiveprovider intent request");
                if (this.checkSetHiveProviderIntentParams(intent)) {
                    this.appIsLaunchingFromIntent = true;
                    await this.uxService.loadIdentityAndShow(false);
                    this.native.setRootRouter("/sethiveproviderrequest");
                }
                else {
                    console.error("Missing or wrong intent parameters for "+intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    this.showErrorAndExitFromIntent(intent);
                }
                break;
        }
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

    async showErrorAndExitFromIntent(intent: ReceivedIntent) {
        let errorMessage = "Sorry, there are invalid parameters in the request";
        errorMessage += "\n\n"+JSON.stringify(intent.params);

        await this.popup.ionicAlert("Action error", errorMessage, "Close");

        console.error(errorMessage);

        await this.uxService.sendIntentResponse(intent.action, {}, intent.intentId);
    }

    checkCredAccessIntentParams(intent) {
        console.log("Checking credaccess intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            console.error("Invalid credaccess parameters received. No params.", intent.params);
            return false;
        }

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            claims: intent.params.claims || [], // We are allowed to request no claim except the DID itself
            customization: intent.params.customization || null,
            nonce: intent.params.nonce || "no-nonce",
            realm: intent.params.realm || "no-realm",
            originalJwtRequest: intent.originalJwtRequest,
            jwtExpirationDays: intent.jwtExpirationDays || 1 // Defaults to 1 day is not info given
        }

        return true;
    }

    checkCredIssueIntentParams(intent) {
        console.log("Checking credissue intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            console.error("Invalid credissue parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.identifier)) {
            console.error("Invalid credissue parameters received. Empty identifier.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.properties)) {
            console.error("Invalid credissue parameters received. Empty properties.", intent.properties);
            return false;
        }

        if (Util.isEmptyObject(intent.params.subjectdid)) {
            console.error("Invalid credissue parameters received. Empty subject DID.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.types) || intent.params.types.length == 0) {
            console.error("Invalid credissue parameters received. Empty types. You must provide at least one type for the credential.", intent.params);
            return false;
        }

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            identifier: intent.params.identifier,
            types: intent.params.types,
            subjectDID: intent.params.subjectdid,
            properties: intent.params.properties,
            expirationDate: intent.params.expirationdate,
            originalJwtRequest: intent.originalJwtRequest
        }
        return true;
    }

    checkAppIdCredIssueIntentParams(intent) {
        console.log("Checking appidcredissue intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            console.error("Invalid appidcredissue parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.appinstancedid)) {
            console.error("Invalid appidcredissue parameters received. Empty appinstancedid.", intent.params);
            return false;
        }

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            appinstancedid: intent.params.appinstancedid,
            appdid: intent.params.appdid,
            params: intent.params
        }
        return true;
    }

    checkCredImportIntentParams(intent) {
        console.log("Checking credimport intent parameters", intent);
        if (Util.isEmptyObject(intent.params) || Util.isEmptyObject(intent.params.credentials)) {
            console.error("Invalid credimport parameters received. No params or empty credentials list.", intent.params);
            return false;
        }

        console.log("DEBUG INTENT PARAMS: "+JSON.stringify(intent.params));

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            credentials: intent.params.credentials,
            customization: intent.params.customization,
            originalJwtRequest: intent.originalJwtRequest
        }
        return true;
    }

    /**
     * Checks generic parameters in the received intent, and fills our requesting DApp object info
     * with intent info for later use.
     */
    checkGenericIntentParams(intent, allowEmptyParams: boolean = false): boolean {
        console.log("Checking generic intent parameters", intent);

        if (!allowEmptyParams && Util.isEmptyObject(intent.params)) {
            console.error("Intent parameters are empty");
            return false;
        }

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            allParams: intent.params,
            originalJwtRequest: intent.originalJwtRequest
        }

        return true;
    }

    checkRegAppProfileIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Check and get specific parameters for this intent
        if (!intent.params.identifier) {
            console.error("Missing profile 'identifier'.");
            return false;
        }

        if (!intent.params.connectactiontitle) {
            console.error("Missing profile 'connectactiontitle'.");
            return false;
        }

        // Config.requestDapp was already initialized earlier.
        Config.requestDapp.identifier = intent.params.identifier;
        Config.requestDapp.connectactiontitle = intent.params.connectactiontitle;
        Config.requestDapp.customcredentialtypes = intent.params.customcredentialtypes;
        Config.requestDapp.allParams = intent.params;

        return true;
    }

    checkSignIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Check and get specific parameters for this intent
        if (!intent.params.data) {
            console.error("Missing 'data'.");
            return false;
        }

        // Config.requestDapp was already initialized earlier.
        Config.requestDapp.allParams = intent.params;

        return true;
    }

    checkSetHiveProviderIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking SetHiveProvider intent parameters");

        if (Util.isEmptyObject(intent.params) || Util.isEmptyObject(intent.params.address)) {
            console.error("Invalid sethiveprovider parameters received. No params or empty address list.", intent.params);
            return false;
        }

        console.log("DEBUG INTENT PARAMS: "+JSON.stringify(intent.params));

        Config.requestDapp = {
            appPackageId: this.extractRootAppId(intent.from),
            intentId: intent.intentId,
            action: intent.action,
            address: intent.params.address,
            name: intent.params.name || '',
        }
        return true;
    }

    checkCreateDIDIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking intent parameters");

        if (!this.checkGenericIntentParams(intent))
            return false;

        // Nothing specific to do yet

        return true;
    }

    checkImportMnemonicIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        return true;
    }

    checkDeleteDIDIntentParams(intent: ReceivedIntent): boolean {
        console.log("Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        return true;
    }
}
