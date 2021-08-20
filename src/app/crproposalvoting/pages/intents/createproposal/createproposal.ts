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
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from 'src/app/model/app.enum';
import { Config } from 'src/app/wallet/config/Config';


export type CreateProposalCommand = CRWebsiteCommand & {
    data: {
        budgets: CreateSuggestionBudget[],
        categorydata: string, // This is empty string
        did: string,
        drafthash: string,      // SHA256D of the suggestion's JSON-string
        newownerpublickey: string,
        newownersignature: string,
        newrecipient: string,
        ownerpublickey: string,     // Public key of proposal owner
        proposaltype: string // Ex: "normal",
        recipient: string, // Ex: ELA address
        signature: string,
        targetproposalhash: string,
        secretarygeneraldid: string,
        secretarygeneralpublickey: string,
        secretarygenerasignature: string,
        userdid: string,
    },
    sid: string     // The suggestion ID to use to get more details. Ex: "5f17e4f9320ba70078a78f09"
}
@Component({
    selector: 'page-create-proposal',
    templateUrl: 'createproposal.html',
    styleUrls: ['./createproposal.scss']
})
export class CreateProposalPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private suggestionID: string;
    public suggestionDetailsFetched = false;
    public suggestionDetails: SuggestionDetails;
    private createProposalCommand: CreateProposalCommand;
    public signingAndSendingProposalResponse = false;
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
        public walletManager: WalletManager,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.create-proposal'));
        this.createProposalCommand = this.crOperations.onGoingCommand as CreateProposalCommand;
        this.suggestionID = this.createProposalCommand.sid;
        this.proposaltype = this.createProposalCommand.data.proposaltype;

        if (this.createProposalCommand.data.proposaltype == "normal") {
            for (let suggestionBudget of this.createProposalCommand.data.budgets) {
                this.buggetAmount += parseInt(suggestionBudget.amount);
            }
        }

        try {
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
            Logger.error('crproposal', 'CreateProposalPage ionViewDidEnter error:', err);
        }
    }

    cancel() {
        this.globalNav.navigateBack();
    }

    private getPayload(): any {
        switch(this.createProposalCommand.data.proposaltype) {
            case "normal":
                return this.getNormalPayload();
            case "changeproposalowner":
                return this.getChangeOwnerPayload();
            case "closeproposal":
                return this.getTerminatePayload();
            case "secretarygeneral":
                return this.getSecretaryGeneralPayload();
            default:
                throw new Error("Don't support this proposaltype: " + this.createProposalCommand.data.proposaltype);
        }
    }

    private async digestFunction(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        switch(this.createProposalCommand.data.proposaltype) {
            case "normal":
                return await this.walletManager.spvBridge.proposalCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "changeproposalowner":
                return await this.walletManager.spvBridge.proposalChangeOwnerCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "closeproposal":
                return await this.walletManager.spvBridge.terminateProposalCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "secretarygeneral":
                return await this.walletManager.spvBridge.proposalSecretaryGeneralElectionCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            default:
                throw new Error("Don't support this proposaltype: " + this.createProposalCommand.data.proposaltype);
        }
    }

    private async creatTransactionFunction(payload: string, memo: string): Promise<string> {
        switch(this.createProposalCommand.data.proposaltype) {
            case "normal":
                return await this.voteService.sourceSubwallet.createProposalTransaction(payload, memo);
            case "changeproposalowner":
                return await this.voteService.sourceSubwallet.createProposalChangeOwnerTransaction(payload, memo);
            case "closeproposal":
                return await this.voteService.sourceSubwallet.createTerminateProposalTransaction(payload, memo);
            case "secretarygeneral":
                return await this.voteService.sourceSubwallet.createSecretaryGeneralElectionTransaction(payload, memo);
            default:
                throw new Error("Don't support this proposaltype: " + this.createProposalCommand.data.proposaltype);
        }
    }

    async signAndCreateProposal() {
        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getPayload();
            Logger.log('crproposal', 'get payload', payload);

            //Get digest
            var digest = await this.digestFunction(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);

            //Get did sign digest
            let ret = await this.signDigest(digest);
            if (ret) {
                payload.CRCouncilMemberSignature = ret;

                //Create transaction
                let rawTx = await this.creatTransactionFunction(JSON.stringify(payload), '');
                await this.voteService.signAndSendRawTransaction(rawTx, App.CRPROPOSAL_VOTING);
            }
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your crproposal. Your crproposal can't be created for now. " + e, "Ok");
            Logger.error('crproposal', 'signAndCreateProposal error:', e);
        }
        this.signingAndSendingProposalResponse = false;
    }

    private getNormalPayload(): any {
        let data = this.createProposalCommand.data;
        let payload = {
            Type: 0,
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            Budgets: [],
            Recipient: data.recipient,

            Signature: data.signature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
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

        return payload;
    }

    private getChangeOwnerPayload(): any {
        let data = this.createProposalCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            TargetProposalHash: data.targetproposalhash,
            NewRecipient: data.newrecipient,
            NewOwnerPublicKey: data.newownerpublickey,
            NewOwnerSignature: data.newownersignature,
            Signature: data.signature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };
        return payload;
    }

    private getTerminatePayload(): any {
        let data = this.createProposalCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            TargetProposalHash: data.targetproposalhash,
            Signature: data.signature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };
        return payload;
    }

    private getSecretaryGeneralPayload(): any {
        let data = this.createProposalCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.drafthash,
            // DraftData: "",
            SecretaryGeneralPublicKey: data.secretarygeneralpublickey,
            SecretaryGeneralDID: data.secretarygeneraldid.replace("did:elastos:", ""),
            Signature: data.signature,
            SecretaryGeneralSignature: data.secretarygenerasignature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return payload;
    }

    async signDigest(digest: string): Promise<string> {
        //Get did sign digest
        let ret = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", {
            data: digest,
        });
        Logger.log('crproposal', "Got signed digest.", ret);
        if (!ret.result) {
            // Operation cancelled by user
            return null;
        }

        //Create transaction and send
        return ret.result.signature;
    }
}