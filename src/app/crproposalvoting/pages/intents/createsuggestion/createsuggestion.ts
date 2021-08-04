import { Component, NgZone, ViewChild } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { ActivatedRoute } from '@angular/router';
import { SuggestionDetails } from '../../../model/suggestion-details';
import { CreateSuggestionBudget, CROperationsService, CRWebsiteCommand } from '../../../services/croperations.service';
import { PopupService } from '../../../services/popup.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Config } from 'src/app/wallet/config/Config';


export type CreateSuggestionCommand = CRWebsiteCommand & {
    data: {
        budgets: CreateSuggestionBudget[],
        categorydata: string, // This is empty string
        drafthash: string,      // SHA256D of the suggestion's JSON-string
        ownerpublickey: string,     // Public key of proposal owner
        proposaltype: string, // Ex: "normal",
        recipient: string, // Ex: ELA address
        newownerpublickey: string,
        newrecipient: string,
        targetproposalhash: string,
        secretarygeneraldid: string,
        secretarygeneralpublickey: string,
        usedid: string
    },
    sid: string     // The suggestion ID to use to get more details. Ex: "5f17e4f9320ba70078a78f09"
}
@Component({
    selector: 'page-create-suggestion',
    templateUrl: 'createsuggestion.html',
    styleUrls: ['./createsuggestion.scss']
})
export class CreateSuggestionPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private originalRequestJWT: string;
    private suggestionID: string;
    public suggestionDetailsFetched = false;
    public suggestionDetails: SuggestionDetails;
    private createSuggestionCommand: CreateSuggestionCommand;
    public signingAndSendingSuggestionResponse = false;
    public creationDate: string = "";
    public buggetAmount: number = 0;
    public Config = Config;
    public proposaltype: string;

    constructor(
        private proposalService: ProposalService,
        private crOperations: CROperationsService,
        private popup: PopupService,
        public translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService,
        private walletManager: WalletManager,
        private voteService: VoteService,
        public theme: GlobalThemeService,
    ) {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.create-suggestion'));
        try {
            this.createSuggestionCommand = this.crOperations.onGoingCommand as CreateSuggestionCommand;
            Logger.log('crproposal', "createSuggestionCommand", this.createSuggestionCommand);
            this.originalRequestJWT = this.crOperations.originalRequestJWT;
            this.suggestionID = this.createSuggestionCommand.sid;
            this.proposaltype = this.createSuggestionCommand.data.proposaltype;

            if (this.createSuggestionCommand.data.proposaltype == "normal") {
                for (let suggestionBudget of this.createSuggestionCommand.data.budgets) {
                    this.buggetAmount += parseInt(suggestionBudget.amount);
                }
            }

            // Fetch more details about this suggestion, to display to the user
            this.suggestionDetails = await this.proposalService.fetchSuggestionDetails(this.suggestionID);
            Logger.log('crproposal', "suggestionDetails", this.suggestionDetails);
            if (this.proposaltype == "changeproposalowner" && this.suggestionDetails.newAddress && !this.suggestionDetails.newOwnerDID) {
                this.proposaltype = "changeproposaladdress";
            }
            this.creationDate = Util.timestampToDateTime(this.suggestionDetails.createdAt * 1000);
            this.suggestionDetailsFetched = true;
        }
        catch (err) {
            Logger.error('crproposal', 'CreateSuggestionPage ionViewDidEnter error:', err);
        }
    }

    cancel() {
        this.globalNav.navigateBack();
    }

    async signAndCreateSuggestion() {
        this.signingAndSendingSuggestionResponse = true;

        // Sign the digest with user's DID, and get a JWT ready to be sent back to the CR website
        try {
            // Create the suggestion/proposal digest - ask the SPVSDK to do this with a silent intent.

            //Get digest
            let digest = await this.getDigest();
            Logger.log('crproposal', "Got proposal digest.", digest);

            //Sign Suggestion Digest As JWT
            let signedJWT = await this.signSuggestionDigestAsJWT(digest);
            Logger.log('crproposal', "signedJWT", signedJWT);

            if (!signedJWT) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingSuggestionResponse = false;
                return;
            }

            //Send response to callback url
            await this.proposalService.sendProposalCommandResponseToCallbackURL(this.createSuggestionCommand.callbackurl, signedJWT);
            //Go to launcher
            await this.globalNav.goToLauncher();

        }
        catch (e) {
            this.signingAndSendingSuggestionResponse = false;
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your suggestion. Your suggestion can't be created for now. " + e, "Ok");
            this.exitIntentWithError();
            return;
        }

        this.signingAndSendingSuggestionResponse = false;
        this.exitIntentWithSuccess();
    }

    private async signSuggestionDigestAsJWT(suggestionDigest: string): Promise<string> {
        Logger.log('crproposal', "Sending intent to sign the suggestion digest", suggestionDigest);

        let result = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", {
            data: suggestionDigest,
            signatureFieldName: "data",
            jwtExtra: {
                type: "signature",
                aud: this.createSuggestionCommand.iss, // ? Need to get from the initially scanned JWT?
                command: "createsuggestion",
                req: "elastos://crproposal/" + this.originalRequestJWT
            }
        });
        Logger.log('crproposal', "Got signed digest.", result);

        if (!result.result || !result.responseJWT) {
            // Operation cancelled by user
            return null;
        }

        return result.responseJWT;
    }

    private async getNormalDigest(): Promise<any> {
        let data = this.createSuggestionCommand.data;
        let payload = {
            Type: 0,
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            Budgets: [],
            Recipient: data.recipient
        };

        // Need to convert from the API "string" type to SPV SDK "int"...
        let budgetTypes = {
            imprest: 0,
            normalpayment: 1,
            finalpayment: 2
        }

        for (let suggestionBudget of data.budgets) {
            payload.Budgets.push({
                Type: budgetTypes[suggestionBudget.type.toLowerCase()],
                Stage: suggestionBudget.stage,
                Amount: suggestionBudget.amount
            });
        }

        let digest = await this.walletManager.spvBridge.proposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getChangeOwnerDigest(): Promise<any> {
        let data = this.createSuggestionCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            TargetProposalHash: data.targetproposalhash,
            NewRecipient: data.newrecipient,
            NewOwnerPublicKey: data.newownerpublickey,
        };

        let digest = await this.walletManager.spvBridge.proposalChangeOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getTerminateDigest(): Promise<any> {
        let data = this.createSuggestionCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            TargetProposalHash: data.targetproposalhash,
        };

        let digest = await this.walletManager.spvBridge.terminateProposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getSecretaryGeneralDigest(): Promise<any> {
        let data = this.createSuggestionCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            SecretaryGeneralPublicKey: data.secretarygeneralpublickey,
            SecretaryGeneralDID: data.secretarygeneraldid.replace("did:elastos:", ""),
        };

        let digest = await this.walletManager.spvBridge.proposalSecretaryGeneralElectionDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private getDigest(): Promise<any> {
        switch(this.createSuggestionCommand.data.proposaltype) {
            case "normal":
                return this.getNormalDigest();
            case "changeproposalowner":
                return this.getChangeOwnerDigest();
            case "closeproposal":
                return this.getTerminateDigest();
            case "secretarygeneral":
                return this.getSecretaryGeneralDigest();
        }
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }
}