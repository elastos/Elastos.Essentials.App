import { Component, ViewChild } from '@angular/core';
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
import { CROperationsService, CRWebsiteCommand } from 'src/app/crproposalvoting/services/croperations.service';

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

    constructor(
        private crOperations: CROperationsService,
        private popup: PopupService,
        public translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        public walletManager: WalletManager,
        private voteService: VoteService,
    ) {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-proposal'));
        this.reviewProposalCommand = this.crOperations.onGoingCommand as ReviewProposalCommand;
        this.voteResult = this.reviewProposalCommand.data.voteResult;
    }

    async signAndCreateProposal() {
        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var proposalPayload = this.getProposalPayload(this.reviewProposalCommand);
            Logger.log('crproposal', "Got review proposal payload.", proposalPayload);

            //Get digest
            var digest = await this.walletManager.spvBridge.proposalReviewDigest(this.voteService.masterWalletId, StandardCoinName.ELA, proposalPayload);
            digest = Util.reverseHexToBE(digest);
            Logger.log('crproposal', "Got review proposal digest.", digest);

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
            proposalPayload.Signature = ret.result.signature;
            const rawTx = await this.walletManager.spvBridge.createProposalReviewTransaction(this.voteService.masterWalletId, StandardCoinName.ELA, proposalPayload, '');
            await this.voteService.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your crproposal. Your crproposal can't be review for now. " + e, "Ok");
        }

        this.signingAndSendingProposalResponse = false;
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