import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { CRCommand, CRCommandType, CROperationsService } from 'src/app/voting/crproposalvoting/services/croperations.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DraftService } from '../../../services/draft.service';

type ReviewMilestoneCommand = CRCommand & {
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

    private onGoingCommand: ReviewMilestoneCommand;
    public signingAndSendingProposalResponse = false;
    public proposalDetail: ProposalDetails;
    public proposalDetailFetched = false;
    public isKeyboardHide = true;
    public content = "";
    public trackingType = "progress";
    typeResult = {
        progress: "approve",
        finalized: "approve",
        rejected: "reject",
    }

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public walletManager: WalletService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public zone: NgZone,
        public keyboard: Keyboard,
        private draftService: DraftService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-milestone'));
        if (this.proposalDetail) {
            return;
        }
        this.proposalDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as ReviewMilestoneCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "ReviewMilestoneCommand", this.onGoingCommand);

        this.proposalDetail = await this.crOperations.getCurrentProposal();
        this.proposalDetailFetched = true;

        if (this.proposalDetail) {
            this.keyboard.onKeyboardWillShow().subscribe(() => {
                this.zone.run(() => {
                    this.isKeyboardHide = false;
                });
            });

            this.keyboard.onKeyboardWillHide().subscribe(() => {
                this.zone.run(() => {
                    this.isKeyboardHide = true;
                });
            });

            let milestone = this.proposalDetail.milestone;
            if (this.onGoingCommand.data.stage == milestone[milestone.length - 1].stage) {
                this.trackingType = "finalized";
            }
            else {
                this.trackingType = this.onGoingCommand.data.proposaltrackingtype || "progress";
            }
        }
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async signAndReviewMilestone() {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        if (this.onGoingCommand.type == CRCommandType.ProposalDetailPage) {
            //Check content value
            if (!this.content || this.content == "") {
                let blankMsg = this.translate.instant('crproposalvoting.opinion')
                    + this.translate.instant('common.text-input-is-blank');
                this.globalNative.genericToast(blankMsg);
                return;
            }

            //Handle opinion
            let data = { content: this.content };
            let ret = await this.draftService.getDraft("opinion.json", data);
            this.onGoingCommand.data.secretaryOpinionHash = ret.hash;
            this.onGoingCommand.data.secretaryOpinionData = ret.data;
            Logger.log(App.CRPROPOSAL_VOTING, "getDraft", ret, data);
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getPayload(this.onGoingCommand);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review milestone payload.", payload);

            //Get digest
            var digest = await this.voteService.sourceSubwallet.proposalTrackingSecretaryDigest(payload);
            // digest = Util.reverseHexToBE(digest);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review milestone digest.", digest);

            //Get did sign digest
            let ret = await this.crOperations.sendSignDigestIntent({
                data: digest,
            });

            if (!ret) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingProposalResponse = false;
                return;
            }

            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);

            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            //Create transaction and send
            payload.SecretaryGeneralSignature = ret.result.signature;
            const rawTx = await this.voteService.sourceSubwallet.createProposalTrackingTransaction(payload, '');
            await this.globalNative.hideLoading();
            await this.crOperations.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            this.signingAndSendingProposalResponse = false;
            await this.globalNative.hideLoading();
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
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
            Type: TrackingTypes[this.trackingType.toLowerCase()],
            ProposalHash: command.data.proposalHash,
            MessageHash: command.data.messageHash,
            MessageData: command.data.messageData,
            Stage: command.data.stage,
            OwnerPublicKey: command.data.ownerPublicKey,
            OwnerSignature: command.data.ownerSignature,
            NewOwnerPublicKey: "",
            NewOwnerSignature: "",
            SecretaryGeneralOpinionHash: command.data.secretaryOpinionHash,
            SecretaryGeneralOpinionData: command.data.secretaryOpinionData,
        };

        return payload;
    }

    segmentChanged(ev: any) {
        this.trackingType = ev.detail.value;
        console.log('Segment changed', ev);
    }
}