import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { CROperationsService, CRWebsiteCommand } from 'src/app/voting/crproposalvoting/services/croperations.service';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { PopupService } from '../../../services/popup.service';

type ReviewProposalCommand = CRWebsiteCommand & {
    data: {
        did: string,
        opinionHash: string,
        proposalHash: string,
        userdid: string,
        voteResult: string // Ex: "approve",
    },
}
@Component({
    selector: 'page-review-proposal',
    templateUrl: 'reviewproposal.html',
    styleUrls: ['./reviewproposal.scss']
})
export class ReviewProposalPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private reviewProposalCommand: ReviewProposalCommand;
    public signingAndSendingProposalResponse = false;
    public voteResult = "";
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;

    constructor(
        private crOperations: CROperationsService,
        private popup: PopupService,
        public translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        public walletManager: WalletService,
        private voteService: VoteService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-proposal'));
        this.reviewProposalCommand = this.crOperations.onGoingCommand as ReviewProposalCommand;
        this.voteResult = this.reviewProposalCommand.data.voteResult;

        try {
            // Fetch more details about this proposal, to display to the user
            this.proposalDetails = await this.proposalService.fetchProposalDetails(this.reviewProposalCommand.data.proposalHash);
            Logger.log('crproposal', "proposalDetails", this.proposalDetails);
            this.proposalDetailsFetched = true;
        }
        catch (err) {
            Logger.error('crproposal', 'ReviewProposalPage ionViewDidEnter error:', err);
        }
    }

    cancel() {
        this.globalNav.navigateBack();
    }

    async signAndReviewProposal() {
        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getProposalPayload(this.reviewProposalCommand);
            Logger.log('crproposal', "Got review proposal payload.", payload);

            //Get digest
            var digest = await this.walletManager.spvBridge.proposalReviewDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);
            Logger.log('crproposal', "Got review proposal digest.", digest);

            //Get did sign digest
            let ret = await this.crOperations.sendSignDigestIntent({
                data: digest,
            });
            Logger.log('crproposal', "Got signed digest.", ret);
            if (ret.result && ret.result.signature) {
                //Create transaction and send
                payload.Signature = ret.result.signature;
                const rawTx = await this.voteService.sourceSubwallet.createProposalReviewTransaction(JSON.stringify(payload), '');
                await this.voteService.signAndSendRawTransaction(rawTx, App.CRPROPOSAL_VOTING);
            }
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your crproposal. Your crproposal can't be review for now. " + e, "Ok");
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
    }

    private getProposalPayload(proposalCommand: ReviewProposalCommand): any {
        let voteResultTypes = {
            approve: 0,
            reject: 1,
            abstain: 2
        }

        let proposalPayload = {
            VoteResult: voteResultTypes[proposalCommand.data.voteResult.toLowerCase()],
            ProposalHash: proposalCommand.data.proposalHash,
            OpinionHash: proposalCommand.data.opinionHash,
            // OpinionData: "",
            DID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return proposalPayload;
    }
}