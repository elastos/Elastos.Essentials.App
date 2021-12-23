import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { CRCommand, CRCommandType, CROperationsService } from 'src/app/voting/crproposalvoting/services/croperations.service';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DraftService } from '../../../services/draft.service';
import { PopupService } from '../../../services/popup.service';

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
    public trackingType = "";
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;
    public isKeyboardHide = true;
    public content = "";
    public voteResult = "approve";

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
        private globalNative: GlobalNativeService,
        public zone: NgZone,
        public keyboard: Keyboard,
        private globalPopupService: GlobalPopupService,
        private draftService: DraftService,
    ) {

    }

    async ionViewWillEnter() {
        if (this.proposalDetailsFetched) {
            return;
        }

        this.keyboard.onKeyboardWillShow().subscribe(() => {
            this.zone.run(() => {
                this.isKeyboardHide = false;
            });
            // console.log('SHOWK');
        });

        this.keyboard.onKeyboardWillHide().subscribe(() => {
            this.zone.run(() => {
                this.isKeyboardHide = true;
            });
            // console.log('HIDEK');
        });

        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-milestone'));
        this.onGoingCommand = this.crOperations.onGoingCommand as ReviewMilestoneCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "onGoingCommand", this.onGoingCommand);
        this.trackingType = this.onGoingCommand.data.proposaltrackingtype || "common";
        this.onGoingCommand.data.ownerPublicKey = await this.crOperations.getOwnerPublicKey();

        try {
            // Fetch more details about this proposal, to display to the user
            this.proposalDetails = await this.proposalService.getCurrentProposal(this.onGoingCommand.data.proposalHash,
                                                this.onGoingCommand.type != CRCommandType.ProposalDetailPage);
            Logger.log(App.CRPROPOSAL_VOTING, "proposalDetails", this.proposalDetails);
        }
        catch (err) {
            Logger.error('crproposal', 'ReviewMilestonePage getCurrentProposal error:', err);
        }
        this.proposalDetailsFetched = true;
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async signAndReviewMilestone() {
        if (this.onGoingCommand.type == CRCommandType.ProposalDetailPage) {
            //Check content value
            if (!this.content || this.content == "") {
                let blankMsg = this.translate.instant('crproposalvoting.opinion')
                                + this.translate.instant('common.text-input-is-blank');
                this.globalNative.genericToast(blankMsg);
                return;
            }

            //Handle opinion
            let data = {opinion: this.voteResult, content: this.content};
            let ret = await this.draftService.getDraft("opinion.json", data);
            this.onGoingCommand.data.secretaryopinionhash = ret.hash;
            this.onGoingCommand.data.secretaryopiniondata = ret.data;
            Logger.log(App.CRPROPOSAL_VOTING, "getDraft", ret, data);
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getPayload(this.onGoingCommand);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review milestone payload.", payload);

            //Get digest
            var digest = await this.walletManager.spvBridge.proposalTrackingSecretaryDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review milestone digest.", digest);

            //Get did sign digest
            let ret = await this.crOperations.sendSignDigestIntent({
                data: digest,
            });
            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
            if (ret.result && ret.result.signature) {
                //Create transaction and send
                payload.SecretaryGeneralSignature = ret.result.signature;
                const rawTx = await this.voteService.sourceSubwallet.createProposalTrackingTransaction(JSON.stringify(payload), '');
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
            OwnerPublicKey: command.data.ownerpubkey,
            OwnerSignature: command.data.ownersignature,
            // OwnerSignature: "f5df8e6d725715af38087ced2d8a537f27632f1fee1e2509022ce9a5cbeb4e7ab3ee708c6af602e6785eb2a2016d7c0a4ff6c6192e42593841e145c717555492",
            NewOwnerPublicKey: "",
            NewOwnerSignature: "",
            SecretaryGeneralOpinionHash: command.data.secretaryopinionhash,
            SecretaryGeneralOpinionData: command.data.secretaryopiniondata,
        };

        return payload;
    }

    segmentChanged(ev: any) {
        this.voteResult = ev.detail.value;
        console.log('Segment changed', ev);
    }
}