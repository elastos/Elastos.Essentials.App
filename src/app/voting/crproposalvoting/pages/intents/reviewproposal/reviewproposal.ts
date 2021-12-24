import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { CRCommand, CRCommandType, CROperationsService } from 'src/app/voting/crproposalvoting/services/croperations.service';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DraftService } from '../../../services/draft.service';

type ReviewProposalCommand = CRCommand & {
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

    private onGoingCommand: ReviewProposalCommand;
    public signingAndSendingProposalResponse = false;
    public voteResult = "";
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;
    public isKeyboardHide = true;
    public content = "";

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public walletManager: WalletService,
        private voteService: VoteService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public zone: NgZone,
        public keyboard: Keyboard,
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
        });

        this.keyboard.onKeyboardWillHide().subscribe(() => {
            this.zone.run(() => {
                this.isKeyboardHide = true;
            });
        });

        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-proposal'));
        this.onGoingCommand = this.crOperations.onGoingCommand as ReviewProposalCommand;

        if (this.onGoingCommand.type == CRCommandType.ProposalDetailPage) {
            this.voteResult = "approve";
            this.proposalDetails = this.onGoingCommand.data;
        }
        else {
            this.voteResult = this.onGoingCommand.data.voteResult.toLowerCase();
            try {
                // Fetch more details about this proposal, to display to the user
                this.proposalDetails = await this.proposalService.fetchProposalDetails(this.onGoingCommand.data.proposalHash);
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
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        if (this.onGoingCommand.type == CRCommandType.ProposalDetailPage) {
            //Check opinion value
            if (!this.content || this.content == "") {
                let blankMsg = this.translate.instant('crproposalvoting.opinion')
                                + this.translate.instant('common.text-input-is-blank');
                this.globalNative.genericToast(blankMsg);
                return;
            }

            //Handle opinion
            let data = {content: this.content}
            let ret = await this.draftService.getDraft("opinion.json", data);
            this.onGoingCommand.data.opinionHash = ret.hash;
            this.onGoingCommand.data.opinionData = ret.data;
            Logger.log(App.CRPROPOSAL_VOTING, "getDraft", ret, data);
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = await this.getProposalPayload(this.onGoingCommand);
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

    private getProposalPayload(command: ReviewProposalCommand): Promise<any> {
        let voteResultTypes = {
            approve: 0,
            reject: 1,
            abstain: 2
        }

        let proposalPayload: any = {
            VoteResult: voteResultTypes[this.voteResult],
            ProposalHash: command.data.proposalHash,
            OpinionHash: command.data.opinionHash,
            OpinionData: command.data.opinionData,
            DID: GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", ""),
        };

        return proposalPayload;
    }

    segmentChanged(ev: any) {
        this.voteResult = ev.detail.value;
        console.log('Segment changed', ev);
    }
}