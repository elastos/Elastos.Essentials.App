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

            this.bugetAmount = 0;
            if (this.proposaltype == "normal") {
                for (let suggestionBudget of this.onGoingCommand.data.budgets) {
                    suggestionBudget.type = suggestionBudget.type.toLowerCase();
                    this.bugetAmount += parseInt(suggestionBudget.amount);
                }
            }

            this.proposaltype = this.suggestionService.getProposalTypeForChangeProposal(this.proposaltype, this.suggestionDetail);
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
        let payload = this.suggestionService.getPayload(this.suggestionDetail.type, this.onGoingCommand.data, this.suggestionDetail);
        payload.Signature = this.onGoingCommand.data.signature;
        payload.CRCouncilMemberDID = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        return payload;
    }

    private async getDigest(payload: string): Promise<any> {
        let digest: string;
        switch (this.suggestionDetail.type) {
            case "normal":
                digest = await this.walletManager.spvBridge.proposalCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "changeproposalowner":
                digest = await this.walletManager.spvBridge.proposalChangeOwnerCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "closeproposal":
                digest = await this.walletManager.spvBridge.terminateProposalCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "secretarygeneral":
                digest = await this.walletManager.spvBridge.proposalSecretaryGeneralElectionCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "reservecustomizedid":
                digest = await this.walletManager.spvBridge.reserveCustomIDCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "receivecustomizedid":
                digest = await this.walletManager.spvBridge.receiveCustomIDCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "changecustomizedidfee":
                digest = await this.walletManager.spvBridge.changeCustomIDFeeCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            case "registersidechain":
                digest = await this.walletManager.spvBridge.registerSidechainCRCouncilMemberDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
                break;
            default:
                throw new Error("Don't support this type: " + this.suggestionDetail.type);
        }
        return Util.reverseHexToBE(digest);
    }

    private async creatTransactionFunction(payload: string, memo: string): Promise<string> {
        switch (this.suggestionDetail.type) {
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
            case "receivecustomizedid":
                return await this.voteService.sourceSubwallet.createReceiveCustomIDTransaction(payload, memo);
            case "changecustomizedidfee":
                return await this.voteService.sourceSubwallet.createChangeCustomIDFeeTransaction(payload, memo);
            case "registersidechain":
                return await this.voteService.sourceSubwallet.createRegisterSidechainTransaction(payload, memo);
            default:
                throw new Error("Don't support this type: " + this.suggestionDetail.type);
        }
    }

    async signAndCreateProposal() {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            let payload = this.getPayload();
            Logger.log(App.CRPROPOSAL_VOTING, 'get payload', payload);

            //Get digest
            let digest = await this.getDigest(JSON.stringify(payload));

            //Get did sign digest
            let ret = await this.signDigest(digest);
            if (!ret) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingProposalResponse = false;
                return;
            }

            payload.CRCouncilMemberSignature = ret;
            //Create transaction
            let rawTx = await this.creatTransactionFunction(JSON.stringify(payload), '');
            Logger.log(App.CRPROPOSAL_VOTING, 'creatTransactionFunction', rawTx);
            await this.crOperations.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            this.signingAndSendingProposalResponse = false;
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
    }

    async signDigest(digest: string): Promise<string> {
        //Get did sign digest
        let ret = await this.crOperations.sendSignDigestIntent({
            data: digest,
        });
        Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
        if (!ret) {
            // Operation cancelled by user
            return null;
        }

        //Create transaction and send
        return ret.result.signature;
    }
}