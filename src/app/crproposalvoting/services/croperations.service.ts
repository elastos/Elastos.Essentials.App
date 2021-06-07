import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PopupService } from './popup.service';

declare let didManager: DIDPlugin.DIDManager;

type CRWebsiteCommand = {
    command: string; // Ex: "voteforproposal"
    callbackurl: string;
    iss: string; // JWT issuer (Normally, the CR website)
}

export type VoteForProposalCommand = CRWebsiteCommand & {
    data: {
        proposalHash: string;
    }
}

type CreateSuggestionBudget = {
    amount: string, // SELA amount
    stage: number, // Ex: 1 // ?
    type: string    // Ex: "FinalPayment"
}

export type CreateSuggestionCommand = CRWebsiteCommand & {
    data: {
        budgets: CreateSuggestionBudget[],
        categorydata: string, // This is empty string
        drafthash: string,      // SHA256D of the suggestion's JSON-string
        ownerpublickey: string,     // Public key of proposal owner
        proposaltype: string // Ex: "normal",
        recipient: string // Ex: ELA address
    },
    sid: string     // The suggestion ID to use to get more details. Ex: "5f17e4f9320ba70078a78f09"
}

@Injectable({
    providedIn: 'root'
})
export class CROperationsService {
    private onGoingCreateSuggestionCommand: CreateSuggestionCommand;
    private onGoingVoteForProposalcommand: VoteForProposalCommand;
    private subscription: Subscription = null;

    constructor(
        private router: Router,
        private popup: PopupService,
        private nav: GlobalNavService,
        private globalIntentService: GlobalIntentService,
    ) {}

    async init() {
        Logger.log("crproposal", "CROperationsService is initializing");
        this.subscription = this.globalIntentService.intentListener.subscribe((receivedIntent)=>{
            if (receivedIntent)
                this.handledReceivedIntent(receivedIntent);
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
        if (receivedIntent.action == "https://did.elastos.net/crproposal")
            this.handleCRProposalIntentRequest(receivedIntent);
    }

    private async handleCRProposalIntentRequest(receivedIntent: EssentialsIntentPlugin.ReceivedIntent) {
        if (!receivedIntent.originalJwtRequest) {
            Logger.error('crproposal', "Received a crproposal intent request that is not encoded as JWT, which is not allowed. Skipping the request");
        }
        else {
            this.handleCRProposalJWTCommand(receivedIntent.originalJwtRequest);
        }
    }

    private async handleCRProposalJWTCommand(crProposalJwtRequest: string) {
        // Parse this JWT and verify the signature. We need to make sure the issuer is on chain.
        let parsedJwtresult = await didManager.parseJWT(true, crProposalJwtRequest);
        if (!parsedJwtresult.signatureIsValid) {
            Logger.warn('crproposal', "Invalid JWT received");
            return;
        }

        Logger.log("crproposal", "JWT signature is valid");

        let jwtPayload = parsedJwtresult.payload as CRWebsiteCommand;
        if (!jwtPayload.command) {
            Logger.warn('crproposal', "Received CR website command without a command field. Skipping.");
            return;
        }

        switch (jwtPayload.command) {
            case "createsuggestion": // For any member to post (with signature) a new suggestion on the CR website
                this.handleCreateSuggestionCommand(jwtPayload as CreateSuggestionCommand, crProposalJwtRequest);
                break;
            case "voteforproposal": // Community impeachment vote after a proposal is agreed by council members
                this.handleVoteForProposalCommand(jwtPayload as VoteForProposalCommand, crProposalJwtRequest);
                break;
            default:
                Logger.warn('crproposal', "Unhandled CR command: ", jwtPayload.command);
                this.popup.alert("Unsupported command", "Sorry, this feature is currently not supported by this capsule", "Ok");
        }
    }

    private async handleVoteForProposalCommand(command: VoteForProposalCommand, jwt: string) {
        Logger.log("crproposal", "Handling vote for proposal command "+command);

        this.onGoingVoteForProposalcommand = command;

        // Show the create suggestion intent screen
        this.nav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/vote-for-proposal-intent", {
            queryParams: {
                jwt: jwt,
                proposalHash: command.data.proposalHash
            }
        });
    }

    private async handleCreateSuggestionCommand(command: CreateSuggestionCommand, jwt: string) {
        Logger.log("crproposal", "Handling Create Suggestion command ", command);

        this.onGoingCreateSuggestionCommand = command;

        // Show the create suggestion intent screen
        this.nav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/create-suggestion-intent", {
            queryParams: {
                jwt: jwt,
                suggestionID: command.sid
            }
        });
    }

    public getOnGoingCreateSuggestionCommand(): CreateSuggestionCommand {
        return this.onGoingCreateSuggestionCommand;
    }

    public getOnGoingVoteForProposalCommand(): VoteForProposalCommand {
        return this.onGoingVoteForProposalcommand;
    }

    public sendIntentResponse(result?: any): Promise<void> {
        // For now do nothing, as we consider all intents will be received by scanning QR codes and no one is
        // expecting a direct response.
        return Promise.resolve();
    }
}
