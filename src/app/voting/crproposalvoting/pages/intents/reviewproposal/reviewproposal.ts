import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { CRCommandType, CROperationsService, CRWebsiteCommand } from 'src/app/voting/crproposalvoting/services/croperations.service';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DraftService } from '../../../services/draft.service';
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
    styleUrls: ['./reviewproposal.scss'],
    providers: [Keyboard]
})
export class ReviewProposalPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private reviewProposalCommand: ReviewProposalCommand;
    public signingAndSendingProposalResponse = false;
    public voteResult = "";
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;
    public isKeyboardHide = true;
    public opinion = "";

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

        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-proposal'));
        this.reviewProposalCommand = this.crOperations.onGoingCommand as ReviewProposalCommand;

        if (this.reviewProposalCommand.type == CRCommandType.ProposalDetailPage) {
            this.voteResult = "approve";
            this.proposalDetails = this.reviewProposalCommand.data;
        }
        else {
            this.voteResult = this.reviewProposalCommand.data.voteResult.toLowerCase();
            try {
                // Fetch more details about this proposal, to display to the user
                this.proposalDetails = await this.proposalService.fetchProposalDetails(this.reviewProposalCommand.data.proposalHash);
            }
            catch (err) {
                Logger.error('crproposal', 'ReviewProposalPage fetchProposalDetails error:', err);
            }
        }
        Logger.log(App.CRPROPOSAL_VOTING, "proposalDetails", this.proposalDetails);
        this.proposalDetailsFetched = true;
    }

    ionViewWillLeave() {
        // this.keyboard.onKeyboardWillShow().unsubscribe();
    }

    cancel() {
        void this.globalNav.navigateBack();
        void this.crOperations.sendIntentResponse();
    }

    async signAndReviewProposal() {
        if (this.reviewProposalCommand.type == CRCommandType.ProposalDetailPage) {
            //Check opinion value
            if (!this.opinion || this.opinion == "") {
                let blankMsg = this.translate.instant('crproposalvoting.opinion')
                                + this.translate.instant('common.text-input-is-blank');
                this.globalNative.genericToast(blankMsg);
                return;
            }

            //Handle opinion
            let ret = await this.draftService.getDraft("opinion.json", this.opinion);
            this.reviewProposalCommand.data.opinionHash = ret.hash;
            this.reviewProposalCommand.data.opinionData = ret.data;
            Logger.log(App.CRPROPOSAL_VOTING, "getDraft", ret, this.reviewProposalCommand);
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = await this.getProposalPayload(this.reviewProposalCommand);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review proposal payload.", payload);

            // //Get digest
            var digest = await this.walletManager.spvBridge.proposalReviewDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);
            Logger.log(App.CRPROPOSAL_VOTING, "Got review proposal digest.", digest);

            //Get did sign digest
            let ret = await this.crOperations.sendSignDigestIntent({
                data: digest,
            });
            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
            if (ret.result && ret.result.signature) {
                //Create transaction and send
                payload.Signature = ret.result.signature;
                const rawTx = await this.voteService.sourceSubwallet.createProposalReviewTransaction(JSON.stringify(payload), '');
                await this.voteService.signAndSendRawTransaction(rawTx, App.CRPROPOSAL_VOTING);
                this.crOperations.goBack();
                this.globalNative.genericToast('crproposalvoting.review-proposal-successfully', 2000, "success");
            }
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.globalPopupService.ionicAlert("common.error", 'crproposalvoting.review-proposal-failed');
            Logger.error('crproposal', 'signAndReviewProposal error:', e);
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
    }

    private getProposalPayload(proposalCommand: ReviewProposalCommand): Promise<any> {
        let voteResultTypes = {
            approve: 0,
            reject: 1,
            abstain: 2
        }

        let proposalPayload: any = {
            VoteResult: voteResultTypes[this.voteResult],
            ProposalHash: proposalCommand.data.proposalHash,
            OpinionHash: proposalCommand.data.opinionHash,
            OpinionData: proposalCommand.data.opinionData,
            DID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return proposalPayload;
    }

    segmentChanged(ev: any) {
        this.voteResult = ev.detail.value;
        console.log('Segment changed', ev);
    }
}