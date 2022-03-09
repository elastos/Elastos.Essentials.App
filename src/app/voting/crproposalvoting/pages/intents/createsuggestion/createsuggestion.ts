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
            this.proposaltype = this.crOperations.getProposalTypeForChangeProposal(this.suggestionDetail);

            this.bugetAmount = 0;
            if (this.proposaltype == "normal") {
                for (let suggestionBudget of this.onGoingCommand.data.budgets) {
                    suggestionBudget.type = suggestionBudget.type.toLowerCase();
                    this.bugetAmount += parseInt(suggestionBudget.amount);
                }
            }

            Logger.log(App.CRSUGGESTION, "suggestionDetail", this.suggestionDetail);
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
            let payload = this.suggestionService.getPayload(this.suggestionDetail.type, this.onGoingCommand.data, this.suggestionDetail);
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

            if ((this.suggestionDetail.type == "changeproposalowner" || this.suggestionDetail.type == "changeproposalowner")
                    && !this.suggestionDetail.signature) {
                this.crOperations.handleSuccessReturn("sign");    // First sign
            }
            else {
                this.crOperations.handleSuccessReturn();
            }
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
        let digest: string;
        switch (this.suggestionDetail.type) {
            case "normal":
                digest = await this.walletManager.spvBridge.proposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "changeproposalowner":
                digest = await this.walletManager.spvBridge.proposalChangeOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "closeproposal":
                digest = await this.walletManager.spvBridge.terminateProposalOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "secretarygeneral":
                digest = await this.walletManager.spvBridge.proposalSecretaryGeneralElectionDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "reservecustomizedid":
                digest = await this.walletManager.spvBridge.reserveCustomIDOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "receivecustomizedid":
                digest = await this.walletManager.spvBridge.receiveCustomIDOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "changecustomizedidfee":
                digest = await this.walletManager.spvBridge.changeCustomIDFeeOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "registersidechain":
                digest = await this.walletManager.spvBridge.registerSidechainOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            default:
                throw new Error("Don't support this type: " + this.proposaltype);
        }
        return Util.reverseHexToBE(digest);
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }
}