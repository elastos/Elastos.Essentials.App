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

type ReviewMilestoneCommand = CRWebsiteCommand & {
    data: {
        messagehash: string,
        newownerpubkey: string,
        newownersignature: string,
        ownerpubkey: string,
        ownersignature: string,
        proposalhash: string,
        proposaltrackingtype: string, //Ex "rejected"
        secretaryopinionhash: string,
        stage: number,
        userdid: string,
    },
}

@Component({
    selector: 'page-review-milestone',
    templateUrl: 'reviewmilestone.html',
    styleUrls: ['./reviewmilestone.scss']
})
export class ReviewMilestonePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private reviewMilestoneCommand: ReviewMilestoneCommand;
    public signingAndSendingProposalResponse = false;
    public trackingType = "";

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
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-milestone'));
        this.reviewMilestoneCommand = this.crOperations.onGoingCommand as ReviewMilestoneCommand;
        this.trackingType = this.reviewMilestoneCommand.data.proposaltrackingtype;
    }

    async signAndReviewMilestone() {
        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getPayload(this.reviewMilestoneCommand);
            Logger.log('crproposal', "Got review milestone payload.", payload);

            //Get digest
            var digest = await this.walletManager.spvBridge.proposalTrackingSecretaryDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
            digest = Util.reverseHexToBE(digest);
            Logger.log('crproposal', "Got review milestone digest.", digest);

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
            payload.SecretaryGeneralSignature = ret.result.signature;
            const rawTx = await this.voteService.sourceSubwallet.createProposalTrackingTransaction(payload, '');
            await this.voteService.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your crproposal. Your crproposal can't be review for now. " + e, "Ok");
        }

        this.signingAndSendingProposalResponse = false;
    }

    private getPayload(command: ReviewMilestoneCommand): any {
        let TrackingTypes = {
            common: 0,
            progress: 1,
            rejected: 2,
            terminated: 3,
            changeOwner: 4,
            finalized: 5
        }

        let payload = {
            Type: TrackingTypes[command.data.proposaltrackingtype.toLowerCase()],
            ProposalHash: command.data.proposalhash,
            MessageHash: command.data.messagehash,
            // MessageData: "",
            Stage: command.data.stage,
            OwnerPublicKey: command.data.ownerpubkey,
            OwnerSignature: command.data.ownersignature,
            // OwnerSignature: "f5df8e6d725715af38087ced2d8a537f27632f1fee1e2509022ce9a5cbeb4e7ab3ee708c6af602e6785eb2a2016d7c0a4ff6c6192e42593841e145c717555492",
            NewOwnerPublicKey:"",
            NewOwnerSignature: "",
            SecretaryGeneralOpinionHash: command.data.secretaryopinionhash,
            // SecretaryGeneralOpinionData: "",
        };

        return payload;
    }
}