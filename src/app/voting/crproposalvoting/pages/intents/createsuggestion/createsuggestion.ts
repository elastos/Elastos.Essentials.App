import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SuggestionDetail } from 'src/app/voting/crproposalvoting/model/suggestion-model';
import { SuggestionService } from 'src/app/voting/crproposalvoting/services/suggestion.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CRCommand, CRCommandType, CreateSuggestionBudget, CROperationsService } from '../../../services/croperations.service';


export type CreateSuggestionCommand = CRCommand & {
    data: {
        budgets: CreateSuggestionBudget[],
        categorydata: string, // This is empty string
        draftHash: string,      // SHA256D of the suggestion's JSON-string
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

    public suggestionDetailFetched = false;
    public suggestionDetail: SuggestionDetail;
    private onGoingCommand: CreateSuggestionCommand;
    public signingAndSendingSuggestionResponse = false;
    public creationDate: string = "";
    public bugetAmount: number = 0;
    public Config = Config;
    public proposaltype: string;

    constructor(
        private suggestionService: SuggestionService,
        private crOperations: CROperationsService,
        public translate: TranslateService,
        private globalNav: GlobalNavService,
        private walletManager: WalletService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
    ) {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.create-suggestion'));

        this.onGoingCommand = this.crOperations.onGoingCommand as CreateSuggestionCommand;
        Logger.log(App.CRSUGGESTION, "onGoingCommand", this.onGoingCommand);
        this.proposaltype = this.onGoingCommand.data.proposaltype || this.onGoingCommand.data.type;
        this.onGoingCommand.data.ownerPublicKey = await this.crOperations.getOwnerPublicKey();

        this.bugetAmount = 0;
        if (this.proposaltype == "normal") {
            for (let suggestionBudget of this.onGoingCommand.data.budgets) {
                suggestionBudget.type = suggestionBudget.type.toLowerCase();
                this.bugetAmount += parseInt(suggestionBudget.amount);
            }
        }

        if (this.onGoingCommand.type == CRCommandType.SuggestionDetailPage) {
            this.suggestionDetail = this.onGoingCommand.data;
        }
        else {
            try {
                // Fetch more details about this suggestion, to display to the user
                this.suggestionDetail = await this.suggestionService.fetchSuggestionDetail(this.onGoingCommand.sid);
            }
            catch (err) {
                Logger.error('crproposal', 'CreateSuggestionPage fetchSuggestionDetail error:', err);
            }
        }

        Logger.log(App.CRSUGGESTION, "suggestionDetail", this.suggestionDetail);
        if (this.proposaltype == "changeproposalowner" && this.suggestionDetail.newRecipient && !this.suggestionDetail.newOwnerDID) {
            this.proposaltype = "changeproposaladdress";
        }
        this.creationDate = Util.timestampToDateTime(this.suggestionDetail.createdAt * 1000);
        this.suggestionDetailFetched = true;
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async signAndCreateSuggestion() {
        this.signingAndSendingSuggestionResponse = true;

        // Sign the digest with user's DID, and get a JWT ready to be sent back to the CR website
        try {
            // Create the suggestion/proposal digest - ask the SPVSDK to do this with a silent intent.

            //Get digest
            let digest = await this.getDigest();
            Logger.log(App.CRSUGGESTION, "Got proposal digest.", digest);

            //Sign Suggestion Digest As JWT
            let signedJWT = await this.signSuggestionDigestAsJWT(digest);
            Logger.log(App.CRSUGGESTION, "signedJWT", signedJWT);

            if (!signedJWT) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingSuggestionResponse = false;
                return;
            }

            await this.suggestionService.postSignSuggestionCommandResponse(signedJWT);
            this.crOperations.handleSuccessReturn();
        }
        catch (e) {
            this.signingAndSendingSuggestionResponse = false;
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        this.signingAndSendingSuggestionResponse = false;
        void this.exitIntentWithSuccess();
    }

    private async signSuggestionDigestAsJWT(suggestionDigest: string): Promise<string> {
        Logger.log(App.CRSUGGESTION, "Sending intent to sign the suggestion digest", suggestionDigest);

        let payload = {
            sid: this.suggestionDetail.sid,
            command: "createsuggestion",
        }

        let result = await this.crOperations.sendSignDigestIntent({
            data: suggestionDigest,
            payload: payload,
        });
        Logger.log(App.CRSUGGESTION, "Got signed digest.", result);

        if (!result.result || !result.responseJWT) {
            // Operation cancelled by user
            return null;
        }

        return result.responseJWT;
    }

    private async getNormalDigest(): Promise<any> {
        let data = this.onGoingCommand.data;
        let payload = {
            Type: 0,
            CategoryData: data.categorydata || "",
            OwnerPublicKey: data.ownerpublickey || data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
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

        Logger.log(App.CRSUGGESTION, "getNormalDigest.", payload);

        let digest = await this.walletManager.spvBridge.proposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getChangeOwnerDigest(): Promise<any> {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            TargetProposalHash: data.targetproposalhash,
            NewRecipient: data.newrecipient,
            NewOwnerPublicKey: data.newownerpublickey,
        };

        Logger.log(App.CRSUGGESTION, "getChangeOwnerDigest.", payload);
        let digest = await this.walletManager.spvBridge.proposalChangeOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getTerminateDigest(): Promise<any> {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            TargetProposalHash: data.targetproposalhash,
        };

        Logger.log(App.CRSUGGESTION, "getTerminateDigest.", payload);
        let digest = await this.walletManager.spvBridge.terminateProposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getSecretaryGeneralDigest(): Promise<any> {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata,
            OwnerPublicKey: data.ownerpublickey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            SecretaryGeneralPublicKey: data.secretarygeneralpublickey,
            SecretaryGeneralDID: data.secretarygeneraldid.replace("did:elastos:", ""),
        };

        Logger.log(App.CRSUGGESTION, "getSecretaryGeneralDigest.", payload);
        let digest = await this.walletManager.spvBridge.proposalSecretaryGeneralElectionDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private async getReserveCustomizeDidDigest(): Promise<any> {
        let data = this.onGoingCommand.data;
        let payload = {
            CategoryData: data.categorydata || "",
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
            ReservedCustomIDList: data.reservedCustomizedIDList,
        };

        Logger.log(App.CRSUGGESTION, "getReserveCustomizeDidDigest.", payload);
        let digest = await this.walletManager.spvBridge.reserveCustomIDOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        return Util.reverseHexToBE(digest);
    }

    private getDigest(): Promise<any> {
        switch (this.proposaltype) {
            case "normal":
                return this.getNormalDigest();
            case "changeproposalowner":
                return this.getChangeOwnerDigest();
            case "closeproposal":
                return this.getTerminateDigest();
            case "secretarygeneral":
                return this.getSecretaryGeneralDigest();
            case "reservecustomizedid":
                return this.getReserveCustomizeDidDigest();
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }
}