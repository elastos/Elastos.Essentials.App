import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { DIDPublicationStatus, GlobalPublicationService } from 'src/app/services/global.publication.service';
import { CredAccessIdentityIntent, IdentityIntent, IdentityIntentParams, RequestCredentialsIntent, SetHiveProviderIdentityIntent } from '../model/identity.intents';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';
import { AppIDService } from './appid.service';
import { Native } from './native';
import { PopupProvider } from './popup';
import { ProfileService } from './profile.service';
import { UXService } from './ux.service';



@Injectable({
    providedIn: 'root'
})
export class IntentReceiverService {
    public static instance: IntentReceiverService;

    private receivedIntent: IdentityIntent<IdentityIntentParams>;
    private onGoingIntentId: number = null;

    constructor(
        public translate: TranslateService,
        public events: Events,
        private native: Native,
        private popup: PopupProvider,
        private appIDService: AppIDService, // Keep it for init
        private uxService: UXService,
        private globalIntentService: GlobalIntentService,
        private profileService: ProfileService,
        private globalPublicationService: GlobalPublicationService
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
     * From a full new-style action string such as https://did.elastos.net/credaccess,
     * returns the short old-style action "credaccess" for convenience.
     */
    private getShortAction(fullAction: string): string {
        let intentDomainRoot = "https://did.elastos.net/";
        return fullAction.replace(intentDomainRoot, "");
    }

    private async onReceiveIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        switch (this.getShortAction(intent.action)) {
            case "credaccess":
                Logger.log('identity', "Received credential access intent request");
                if (this.checkCredAccessIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/credaccessrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "requestcredentials":
                Logger.log('identity', "Received request credentials intent request");
                if (this.checkRequestCredentialsIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/requestcredentials");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credimport":
                Logger.log('identity', "Received credential import intent request");
                if (this.checkCredImportIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);

                    this.setOnGoingIntentId(intent.intentId); // Save globally in case the launched screen needs to send a child intent
                    void this.native.setRootRouter("/identity/intents/credimportrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credcontextimport":
                Logger.log('identity', "Received credential context import intent request");
                if (this.checkCredContextImportIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);

                    this.setOnGoingIntentId(intent.intentId); // Save globally in case the launched screen needs to send a child intent
                    void this.native.setRootRouter("/identity/intents/credcontextimportrequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "credissue":
                Logger.log('identity', "Received credential issue intent request");
                if (this.checkCredIssueIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/credissuerequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "creddelete":
                Logger.log('identity', "Received credential delete intent request");
                if (this.checkCredDeleteIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);

                    this.setOnGoingIntentId(intent.intentId); // Save globally in case the launched screen needs to send a child intent
                    void this.native.setRootRouter("/identity/intents/creddeleterequest");
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "didsign":
                Logger.log('identity', "Received didsign intent request");
                if (this.checkSignIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/signrequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for " + intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "signdigest":
                Logger.log('identity', "Received didsign intent request");
                if (this.checkSignIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/signdigest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for " + intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "appidcredissue":
                Logger.log('identity', "Received appid credential issue intent request");
                if (this.checkAppIdCredIssueIntentParams(intent)) {
                    if (!DIDSessionsStore.signedInDIDString) {
                        Logger.log("identity", "No signed in identity. Returning no app id credential");
                        await this.uxService.sendIntentResponse({}, intent.intentId);
                    }
                    else {
                        await this.uxService.loadIdentityAndShow(false);

                        //let appIdIssueIntent = intent as AppIdCredIssueIdentityIntent;

                        // Check if we can directly fullfil the request or not (silent intent).
                        // From inside trinity, as the runtime can ensure the app did, we can directly
                        // issue the credential most of the times. Native apps though require a UI
                        // confirmation.
                        //this.appIDService.prepareNextRequest(appIdIssueIntent.intentId, appIdIssueIntent.params.appPackageId, appIdIssueIntent.params.appinstancedid, appIdIssueIntent.params.appdid);
                        //if (await this.appIDService.applicationIDCredentialCanBeIssuedWithoutUI(appIdIssueIntent.params)) {
                        //    void this.appIDService.generateAndSendApplicationIDCredentialIntentResponse(appIdIssueIntent.params);
                        //}
                        //else {
                        // We have to show a UI confirmation so let's do it.
                        void this.native.setRootRouter("/identity/intents/appidcredissuerequest");
                        //}
                    }
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "hivebackupcredissue":
                Logger.log('identity', "Received hive backup credential issue intent request");
                if (this.checkHiveBackupCredIssueIntentParams(intent)) {
                    if (!DIDSessionsStore.signedInDIDString) {
                        Logger.log("identity", "No signed in identity. Returning no hive backup credential");
                        await this.uxService.sendIntentResponse({}, intent.intentId);
                    }
                    else {
                        await this.uxService.loadIdentityAndShow(false);

                        void this.native.setRootRouter("/identity/intents/hivebackupcredissuerequest");
                    }
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case 'promptpublishdid':
                if (this.checkGenericIntentParams(intent)) {
                    await this.handlePromptPublishDid();
                }
                else {
                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case 'didtransaction':
                if (this.checkDIDTransactionIntentParams(intent)) {
                    await this.handleDidTransactionRequest(intent);
                }
                else {
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "registerapplicationprofile":
                Logger.log('identity', "Received register application profile intent request");
                if (this.checkRegAppProfileIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);
                    void this.native.setRootRouter("/identity/intents/regappprofilerequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for " + intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
            case "sethiveprovider":
                Logger.log('identity', "Received set hiveprovider intent request");
                if (this.checkSetHiveProviderIntentParams(intent)) {
                    await this.uxService.loadIdentityAndShow(false);

                    this.setOnGoingIntentId(intent.intentId); // Save globally in case the launched screen needs to send a child intent
                    void this.native.setRootRouter("/identity/intents/sethiveproviderrequest");
                }
                else {
                    Logger.error('identity', "Missing or wrong intent parameters for " + intent.action);

                    // Something wrong happened while trying to handle the intent: send intent response with error
                    void this.showErrorAndExitFromIntent(intent);
                }
                break;
        }
    }

    /**
     * Saves the intent ID currently being processed by one of the identity intent screens.
     * this allows some intent screens to launch sub-intents, such as publishing a DID with a
     * wallet intent.
     *
     * Implementation reason:
     * - cred import (publish) -> call wallet did publish intent (stuck)
     * - But the flow to "publish" contains several events, not convenient to just "forward" the parent intent id
     */
    public setOnGoingIntentId(intentId: number) {
        this.onGoingIntentId = intentId;
    }

    public getOnGoingIntentId(): number {
        return this.onGoingIntentId;
    }

    public clearOnGoingIntentId() {
        this.onGoingIntentId = null;
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
        errorMessage += "\n\n" + JSON.stringify(intent.params);

        await this.popup.ionicAlert("Action error", errorMessage, this.translate.instant("common.close"));

        Logger.error('identity', errorMessage);

        await this.uxService.sendIntentResponse({}, intent.intentId);
    }

    private checkCredAccessIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking credaccess intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid credaccess parameters received. No params.", intent.params);
            return false;
        }

        let credAccessIntent: CredAccessIdentityIntent = intent;
        credAccessIntent.params.claims = credAccessIntent.params.claims || [];
        credAccessIntent.params.publisheddid = credAccessIntent.params.publisheddid || true;
        credAccessIntent.params.nonce = credAccessIntent.params.nonce || "no-nonce";
        credAccessIntent.params.realm = credAccessIntent.params.realm || "no-realm";
        credAccessIntent.jwtExpirationDays = credAccessIntent.jwtExpirationDays || 1;
        this.receivedIntent = credAccessIntent;

        return true;
    }

    private checkRequestCredentialsIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking requestcredentials intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid requestcredentials parameters received. No params.", intent.params);
            return false;
        }

        let requestCredentialsIntent: RequestCredentialsIntent = intent;
        // TODO: check some internal field here
        this.receivedIntent = requestCredentialsIntent;

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

        this.receivedIntent = intent;

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

    private checkHiveBackupCredIssueIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking hivebackupcredissue intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid hivebackupcredissue parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.sourceHiveNodeDID) ||
            Util.isEmptyObject(intent.params.targetHiveNodeDID) ||
            Util.isEmptyObject(intent.params.targetNodeURL)) {
            Logger.error('identity', "Invalid hivebackupcredissue parameters received. Empty sourceHiveNodeDID, targetHiveNodeDID or targetNodeURL.", intent.params);
            return false;
        }

        this.receivedIntent = intent;

        return true;
    }

    private checkCredDeleteIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking creddelete intent parameters");
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('identity', "Invalid creddelete parameters received. Empty parameters.", intent.params);
            return false;
        }

        if (Util.isEmptyObject(intent.params.credentialsids)) {
            Logger.error('identity', "Invalid creddelete parameters received. Empty credentialsids.", intent.params);
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

    private checkCredContextImportIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log('identity', "Checking credcontextimport intent parameters", intent);
        if (Util.isEmptyObject(intent.params) || Util.isEmptyObject(intent.params.credential) || !intent.params.serviceName) {
            Logger.error('identity', "Invalid credcontextimport parameters received. No params or missing serviceName / credential.", intent.params);
            return false;
        }

        this.receivedIntent = intent;

        return true;
    }

    /**
     * Checks generic parameters in the received intent, and fills our requesting DApp object info
     * with intent info for later use.
     */
    private checkGenericIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent, allowEmptyParams = false): boolean {
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

        this.receivedIntent = intent;

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

        this.receivedIntent = intent;

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

        this.receivedIntent = intent;

        return true;
    }

    private checkImportMnemonicIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        this.receivedIntent = intent;

        return true;
    }

    private checkDeleteDIDIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        Logger.log('identity', "Checking intent parameters");

        if (!this.checkGenericIntentParams(intent, true))
            return false;

        // Nothing specific to do yet

        this.receivedIntent = intent;

        return true;
    }

    private checkDIDTransactionIntentParams(intent: EssentialsIntentPlugin.ReceivedIntent): boolean {
        if (!this.checkGenericIntentParams(intent, true))
            return false;

        if (!("didrequest" in intent.params))
            return false;

        let didRequest = intent.params.didrequest as { header: any, payload: any, proof: { verificationMethod: string } };
        if (!("proof" in didRequest) || !("verificationMethod" in didRequest.proof))
            return false;

        return true;
    }

    private async handleDidTransactionRequest(intent: EssentialsIntentPlugin.ReceivedIntent) {
        // NOTE: wallet's didtransaction VS did's didtransaction:
        // Wallet will show the wallet confirmation screen directly, to publish with the wallet.
        // This one (did) will use the publication service current settings, possibly redirecting to the wallet
        let didRequest = intent.params.didrequest as { header: any, payload: any, proof: { verificationMethod: string } };
        let didString = didRequest.proof.verificationMethod.substring(0, didRequest.proof.verificationMethod.indexOf("#"));
        Logger.log("identity", "Asking publication manager to handle did transaction", didString, didRequest);
        await this.globalPublicationService.resetStatus();
        let pubStatusSub = this.globalPublicationService.publicationStatus.subscribe(status => {
            if (status.didString == didString) {
                if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
                    pubStatusSub.unsubscribe();
                    void this.uxService.sendIntentResponse({
                        txid: status.txId
                    }, intent.intentId);
                }
                else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
                    pubStatusSub.unsubscribe();
                    void this.uxService.sendIntentResponse({
                        txid: null
                    }, intent.intentId);
                }
            }
        });
        await this.globalPublicationService.publishDIDFromRequest(didString, didRequest, "", true);
    }

    private async handlePromptPublishDid() {
        let publicationStatus = this.globalPublicationService.publicationStatus.subscribe((status) => {
            Logger.log("identity", "(intent) DID publication status update for DID", status);
            if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
                Logger.log("identity", "(intent) DID publication complete, sending intent response");

                publicationStatus.unsubscribe();
                void this.uxService.sendIntentResponse({
                    txid: status.txId
                }, this.receivedIntent.intentId);
            }
            else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
                Logger.warn("identity", "(intent) DID publication failure, sending intent response");

                publicationStatus.unsubscribe();
                void this.uxService.sendIntentResponse({
                    txid: null
                }, this.receivedIntent.intentId);
            }
        });

        await this.uxService.loadIdentityAndShow(false);
        await this.native.setRootRouter('/identity/myprofile/home');

        let publicationStarted = await this.profileService.promptPublishDid(false);
        if (!publicationStarted) {
            Logger.warn("identity", "(intent) DID publication cancelled, sending intent response");
            publicationStatus.unsubscribe();
            void this.uxService.sendIntentResponse({
                txid: null
            }, this.receivedIntent.intentId);
        }
    }
}
