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
import { CRCommand, CreateSuggestionBudget, CROperationsService } from '../../../services/croperations.service';
import { UXService } from '../../../services/ux.service';


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
        public uxService: UXService,
    ) {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.create-suggestion'));
        if (this.suggestionDetail) {
            return;
        }
        this.suggestionDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as CreateSuggestionCommand;
        Logger.log(App.CRSUGGESTION, "CreateSuggestionCommand", this.onGoingCommand);

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

            Logger.log(App.CRSUGGESTION, "suggestionDetail", this.suggestionDetail);
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

    async signAndCreateSuggestion() {
        this.signingAndSendingSuggestionResponse = true;

        // Sign the digest with user's DID, and get a JWT ready to be sent back to the CR website
        try {
            // Create the suggestion/proposal digest - ask the SPVSDK to do this with a silent intent.

            //Get payload
            let payload = this.suggestionService.getPayload(this.proposaltype, this.onGoingCommand.data);
            Logger.log(App.CRPROPOSAL_VOTING, 'get payload', payload);

            //Get digest
            let digest = await this.getDigest(JSON.stringify(payload));
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

        if (!result || !result.responseJWT) {
            // Operation cancelled by user
            return null;
        }

        return result.responseJWT;
    }

    private async getDigest(payload: string): Promise<any> {
        var digestFunction: any;
        switch (this.proposaltype) {
            case "normal":
                digestFunction = this.walletManager.spvBridge.proposalOwnerDigest;
                break;
            case "changeproposalowner":
                digestFunction = this.walletManager.spvBridge.proposalChangeOwnerDigest;
                break;
            case "closeproposal":
                digestFunction = this.walletManager.spvBridge.terminateProposalOwnerDigest;
                break;
            case "secretarygeneral":
                digestFunction = this.walletManager.spvBridge.proposalSecretaryGeneralElectionDigest;
                break;
            case "reservecustomizedid":
                digestFunction = this.walletManager.spvBridge.reserveCustomIDOwnerDigest;
                break;
            case "receivecustomizedid":
                digestFunction = this.walletManager.spvBridge.receiveCustomIDOwnerDigest;
                break;
            case "changecustomizedidfee":
                digestFunction = this.walletManager.spvBridge.changeCustomIDFeeOwnerDigest;
                break;
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
        let digest = await digestFunction(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
        return Util.reverseHexToBE(digest);
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }
}