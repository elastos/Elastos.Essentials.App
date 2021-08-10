import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PopupProvider } from 'src/app/services/global.popup.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { PopupService } from './popup.service';

declare let didManager: DIDPlugin.DIDManager;

export type CRWebsiteCommand = {
    command: string; // Ex: "voteforproposal"
    callbackurl: string;
    iss: string; // JWT issuer (Normally, the CR website)
    data: any;
}

export type CreateSuggestionBudget = {
    amount: string, // SELA amount
    stage: number, // Ex: 1 // ?
    type: string    // Ex: "FinalPayment"
}
@Injectable({
    providedIn: 'root'
})
export class CROperationsService {
    private subscription: Subscription = null;

    public originalRequestJWT: string;
    public onGoingCommand: any;

    constructor(
        private popup: PopupService,
        private globalIntentService: GlobalIntentService,
        private voteService: VoteService,
        public popupProvider: PopupProvider,
    ) {}

    init() {
        this.subscription = this.globalIntentService.intentListener.subscribe((receivedIntent)=>{
            if (receivedIntent)
                void this.handledReceivedIntent(receivedIntent);
        });
    }

    public stop() {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    }

    addOnItemClickedListener(icon) {
        if (icon.key == "scan") {
            this.handleScanAction();
        }
    }

    private async handleScanAction() {
        try {
            let data = await this.globalIntentService.sendIntent("scanqrcode", null);
            Logger.log("crproposal", "Scan result", data);
            if (data && data.result && data.result.scannedContent)
                this.handleScannedContent(data.result.scannedContent);
            else
                Logger.warn('crproposal', "Unable to handle the scanned QR code - no scanned content info");
        }
        catch (err) {
            Logger.error('crproposal', err);
        }
    }

    private async handleScannedContent(scannedContent: string) {
        if (scannedContent.startsWith("https://did.elastos.net/crproposal/")) {
            let jwt = scannedContent.replace("https://did.elastos.net/crproposal/", "");
            this.handleCRProposalJWTCommand(jwt);
        }
        else {
            Logger.warn('crproposal', "Unhandled QR code content:", scannedContent);
        }
    }

    private async handledReceivedIntent(receivedIntent: EssentialsIntentPlugin.ReceivedIntent) {
        if (receivedIntent.action == "https://did.elastos.net/crproposal") {
            this.handleCRProposalIntentRequest(receivedIntent);
        }
    }

    private async handleCRProposalIntentRequest(receivedIntent: EssentialsIntentPlugin.ReceivedIntent) {
        if (!receivedIntent.originalJwtRequest) {
            Logger.error('crproposal', "Received a crproposal intent request that is not encoded as JWT, which is not allowed. Skipping the request");
        }
        else {
            this.voteService.intentAction = receivedIntent.action;
            this.voteService.intentId = receivedIntent.intentId;
            if (!this.handleCRProposalJWTCommand(receivedIntent.originalJwtRequest)) {
                await this.sendIntentResponse();
            }
        }
    }

    private async handleCRProposalJWTCommand(crProposalJwtRequest: string): Promise<boolean> {
        // Parse this JWT and verify the signature. We need to make sure the issuer is on chain.
        let parsedJwtresult = await didManager.parseJWT(true, crProposalJwtRequest);
        if (!parsedJwtresult.signatureIsValid) {
            Logger.error('crproposal', "Invalid JWT received", parsedJwtresult);
            await this.popup.alert("Invalid JWT", parsedJwtresult.errorReason, "Ok");
            return false;
        }

        let jwtPayload = parsedJwtresult.payload as CRWebsiteCommand;
        if (!jwtPayload.command) {
            this.popup.alert("crproposal", "Received CR website command without a command field. Skipping.", "Ok");
            return false;
        }

        this.originalRequestJWT = crProposalJwtRequest;
        this.onGoingCommand = jwtPayload;

        if (!Util.isEmptyObject(jwtPayload.data.userdid)) {
            if (jwtPayload.data.userdid != GlobalDIDSessionsService.signedInDIDString) {
                Logger.warn('crproposal', "The did isn't match");
                await this.popupProvider.ionicAlert('wallet.text-warning', 'crproposalvoting.wrong-did');
                return false;
            }
        }

        switch (jwtPayload.command) {
            case "createsuggestion":
            case "createproposal":
            case "reviewproposal":
            case "voteforproposal":
            case "updatemilestone":
            case "reviewmilestone":
            case "withdraw":
                await this.voteService.selectWalletAndNavTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/" + jwtPayload.command);
                break;

            default:
                Logger.warn('crproposal', "Unhandled CR command: ", jwtPayload.command);
                this.popup.alert("Unsupported command", "Sorry, this feature is currently not supported by this capsule", "Ok");
        }

        return true;
    }

    public sendIntentResponse(result?: any): Promise<void> {
        // For now do nothing, as we consider all intents will be received by scanning QR codes and no one is
        // expecting a direct response.
        return Promise.resolve();
    }
}
