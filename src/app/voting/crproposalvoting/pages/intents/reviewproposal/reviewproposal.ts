import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
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
    public proposalDetail: ProposalDetails;
    public proposalDetailFetched = false;
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
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.review-proposal'));
        if (this.proposalDetail) {
            return;
        }
        this.proposalDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as ReviewProposalCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "ReviewProposalCommand", this.onGoingCommand);

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

            this.voteResult = this.onGoingCommand.data.voteResult || "approve";
            this.voteResult.toLowerCase()
        }
    }

    ionViewWillLeave() {
        // this.keyboard.onKeyboardWillShow().unsubscribe();
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
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

            if (!ret) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingProposalResponse = false;
                return;
            }

            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
            //Create transaction and send
            payload.Signature = ret.result.signature;
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createProposalReviewTransaction(JSON.stringify(payload), '');
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
            DID: Util.getShortDidString(),
        };

        return proposalPayload;
    }

    segmentChanged(ev: any) {
        this.voteResult = ev.detail.value;
        console.log('Segment changed', ev);
    }
}