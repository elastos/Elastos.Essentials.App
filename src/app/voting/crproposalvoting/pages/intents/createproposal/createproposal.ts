import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { SuggestionDetail } from '../../../model/suggestion-model';
import { CRCommand, CreateSuggestionBudget, CROperationsService } from '../../../services/croperations.service';
import { SuggestionService } from '../../../services/suggestion.service';

export type CreateProposalCommand = CRCommand & {
    data: {
        budgets: CreateSuggestionBudget[],
        categorydata: string, // This is empty string
        did: string,
        draftHash: string,      // SHA256D of the suggestion's JSON-string
        newownerpublickey: string,
        newownersignature: string,
        newrecipient: string,
        ownerpublickey: string,     // Public key of proposal owner
        type: string // Ex: "normal",
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

    public suggestionDetailFetched = false;
    public suggestionDetail: SuggestionDetail;
    private onGoingCommand: CreateProposalCommand;
    public signingAndSendingProposalResponse = false;
    public creationDate = "";
    public bugetAmount = 0;
    public Config = Config;
    public proposaltype: string;

    constructor(
        private suggestionService: SuggestionService,
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public walletManager: WalletService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.create-proposal'));
        if (this.suggestionDetail) {
            return;
        }
        this.suggestionDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as CreateProposalCommand;
        Logger.log(App.CRSUGGESTION, "CreateProposalCommand", this.onGoingCommand);

        this.suggestionDetail = await this.crOperations.getCurrentSuggestion();
        this.suggestionDetailFetched = true;
        if (this.suggestionDetail) {
            this.proposaltype = this.suggestionDetail.type;
            this.onGoingCommand.data.ownerPublicKey = await this.crOperations.getOwnerPublicKey();

            this.bugetAmount = 0;
            if (this.proposaltype == "normal") {
                for (let suggestionBudget of this.onGoingCommand.data.budgets) {
                    suggestionBudget.type = suggestionBudget.type.toLowerCase();
                    this.bugetAmount += parseInt(suggestionBudget.amount);
                }
            }

            if (this.proposaltype == "changeproposalowner" && this.suggestionDetail.newRecipient && !this.suggestionDetail.newOwnerDID) {
                this.proposaltype = "changeproposaladdress";
            }
            this.creationDate = Util.timestampToDateTime(this.suggestionDetail.createdAt * 1000);
        }
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    private getPayload(): any {
        switch (this.proposaltype) {
            case "normal":
                return this.getNormalPayload();
            case "changeproposalowner":
                return this.getChangeOwnerPayload();
            case "closeproposal":
                return this.getTerminatePayload();
            case "secretarygeneral":
                return this.getSecretaryGeneralPayload();
            case "reservecustomizedid":
                return this.getReserveCustomizeDidPayload();
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
    }

    private async digestFunction(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        switch (this.proposaltype) {
            case "normal":
                return await this.walletManager.spvBridge.proposalCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "changeproposalowner":
                return await this.walletManager.spvBridge.proposalChangeOwnerCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "closeproposal":
                return await this.walletManager.spvBridge.terminateProposalCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "secretarygeneral":
                return await this.walletManager.spvBridge.proposalSecretaryGeneralElectionCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            case "reservecustomizedid":
                return await this.walletManager.spvBridge.reserveCustomIDCRCouncilMemberDigest(masterWalletId, elastosChainCode, payload);
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
    }

    private async creatTransactionFunction(payload: string, memo: string): Promise<string> {
        switch (this.proposaltype) {
            case "normal":
                return await this.voteService.sourceSubwallet.createProposalTransaction(payload, memo);
            case "changeproposalowner":
                return await this.voteService.sourceSubwallet.createProposalChangeOwnerTransaction(payload, memo);
            case "closeproposal":
                return await this.voteService.sourceSubwallet.createTerminateProposalTransaction(payload, memo);
            case "secretarygeneral":
                return await this.voteService.sourceSubwallet.createSecretaryGeneralElectionTransaction(payload, memo);
            case "reservecustomizedid":
                return await this.voteService.sourceSubwallet.createReserveCustomIDTransaction(payload, memo);
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
    }

    async signAndCreateProposal() {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getPayload();
            Logger.log(App.CRPROPOSAL_VOTING, 'get payload', payload);

            //Get digest
            var digest = await this.digestFunction(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);

            //Get did sign digest
            let ret = await this.signDigest(digest);
            if (ret) {
                payload.CRCouncilMemberSignature = ret;

                //Create transaction
                let rawTx = await this.creatTransactionFunction(JSON.stringify(payload), '');
                Logger.log(App.CRPROPOSAL_VOTING, 'creatTransactionFunction', rawTx);
                await this.crOperations.signAndSendRawTransaction(rawTx);
            }
        }
        catch (e) {
            this.signingAndSendingProposalResponse = false;
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
    }

    private getNormalPayload(): any {
        let data = this.onGoingCommand.data;
        let payload = {
            Type: 0,
            CategoryData: data.categorydata || "",
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
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
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
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
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            TargetProposalHash: data.targetproposalhash,
            Signature: data.signature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };
        return payload;
    }

    private getSecretaryGeneralPayload(): any {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            SecretaryGeneralPublicKey: data.secretarygeneralpublickey,
            SecretaryGeneralDID: data.secretarygeneraldid.replace("did:elastos:", ""),
            Signature: data.signature,
            SecretaryGeneralSignature: data.secretarygenerasignature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return payload;
    }

    private getReserveCustomizeDidPayload(): any {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata || "",
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            ReservedCustomIDList: this.suggestionDetail.reservedCustomizedIDList,
            Signature: data.signature,
            CRCouncilMemberDID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return payload;
    }

    async signDigest(digest: string): Promise<string> {
        //Get did sign digest
        let ret = await this.crOperations.sendSignDigestIntent({
            data: digest,
        });
        Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
        if (!ret.result) {
            // Operation cancelled by user
            return null;
        }

        //Create transaction and send
        return ret.result.signature;
    }
}