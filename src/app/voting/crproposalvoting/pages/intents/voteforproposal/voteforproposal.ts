import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { VoteContentType, VotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { DposStatus, VoteService } from 'src/app/voting/services/vote.service';
import { StakeService } from 'src/app/voting/staking/services/stake.service';
import { Config } from 'src/app/wallet/config/Config';
import { VoteContent, VoteTypeString } from 'src/app/wallet/model/elastos.types';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { CRCommand, CROperationsService } from '../../../services/croperations.service';

type VoteForProposalCommand = CRCommand & {
    data: {
        proposalHash: string;
    }
}
@Component({
    selector: 'page-voteforproposal',
    templateUrl: 'voteforproposal.html',
    styleUrls: ['./voteforproposal.scss']
})
export class VoteForProposalPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private onGoingCommand: VoteForProposalCommand;
    public proposalDetail: ProposalDetails;
    public proposalDetailFetched = false;
    public signingAndSendingProposalResponse = false;
    public maxVotes = 0;
    public amount = 0;
    public isKeyboardHide = true;

    constructor(
        private crOperations: CROperationsService,
        private stakeService: StakeService,
        public translate: TranslateService,
        private globalPopupService: GlobalPopupService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public keyboard: Keyboard,
        public zone: NgZone,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.vote-proposal'));
        if (this.proposalDetail) {
            return;
        }
        this.proposalDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as VoteForProposalCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "VoteForProposalCommand", this.onGoingCommand);

        this.proposalDetail = await this.crOperations.getCurrentProposal();

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
            await this.stakeService.getVoteRights();
            if (this.stakeService.votesRight.totalVotesRight > 0) {
                this.maxVotes = this.stakeService.votesRight.totalVotesRight;
            }
            else {
                let status = await this.voteService.dPoSStatus.value;
                if (status == DposStatus.DPoSV2) {
                    this.maxVotes = 0;
                }
                else if (this.voteService.sourceSubwallet.masterWallet.type == WalletType.MULTI_SIG_STANDARD) {
                    // Multi-signature wallets can only vote with staked ELA.
                    this.maxVotes = 0;
                } else {
                    this.maxVotes = await this.voteService.getMaxVotes();
                }
            }
        }

        this.proposalDetailFetched = true;
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async voteAgainstProposal() {
        await this.goTransaction();
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }


    async goTransaction(): Promise<boolean> {
        switch (this.voteService.sourceSubwallet.masterWallet.type) {
            case WalletType.STANDARD:
            case WalletType.MULTI_SIG_STANDARD:
                break;
            case WalletType.LEDGER:
                await this.globalPopupService.ionicAlert('common.warning', 'voting.ledger-reject-voting');
                return;
            case WalletType.MULTI_SIG_EVM_GNOSIS:
                await this.globalPopupService.ionicAlert('common.warning', 'voting.multi-sign-reject-voting');
                return;
            default:
                // Should not happen.
                Logger.error('wallet', 'Not support, pls check the wallet type:', this.voteService.sourceSubwallet.masterWallet.type)
                return;
        }

        try {
            if (this.amount > this.maxVotes) {
                await this.globalPopupService.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.greater-than-max-votes');
                return false;
            }
            else if (this.amount <= 0) {
                await this.globalPopupService.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.less-than-equal-zero-votes');
                return false;
            }

            this.signingAndSendingProposalResponse = true;

            // Request the wallet to publish our vote.
            if (await this.voteService.sourceSubwallet.hasPendingBalance(true)) {
                this.signingAndSendingProposalResponse = false;
                await this.globalPopupService.ionicAlert('common.warning', 'wallet.transaction-pending', "common.understood");
                return false;
            }

            const stakeAmount = Util.accMul(this.amount, Config.SELA).toString();
            if (this.stakeService.votesRight.totalVotesRight > 0) {
                await this.createVoteCRProposalTransactionV2(stakeAmount);
            }
            else {
                await this.createVoteCRProposalTransaction(stakeAmount);
            }
        }
        finally {
            this.signingAndSendingProposalResponse = false;
        }
        return true;
    }

    async createVoteCRProposalTransaction(voteAmount: string) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);

        let votes = {};
        votes[this.onGoingCommand.data.proposalHash] = voteAmount; // Vote with everything
        Logger.log('wallet', "Vote:", votes);

        let crVoteContent: VoteContent = {
            Type: VoteTypeString.CRCProposal,
            Candidates: votes
        }

        const voteContent = [crVoteContent];

        try {
            const rawTx = await this.voteService.sourceSubwallet.createVoteTransaction(
                voteContent,
                '', //memo
            );

            await this.crOperations.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        void this.crOperations.sendIntentResponse();
    }

    async createVoteCRProposalTransactionV2(voteAmount: string) {
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);
        const voteContents: VotesContentInfo[] = [
            {
                VoteType: VoteContentType.CRCProposal,
                VotesInfo: [
                    {
                        Candidate: this.onGoingCommand.data.proposalHash,
                        Votes: voteAmount,
                        Locktime: 0
                    }
                ]
            }
        ];

        const payload: VotingInfo = {
            Version: 0,
            Contents: voteContents
        };

        try {
            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                payload,
                '', //memo
            );

            await this.crOperations.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        void this.crOperations.sendIntentResponse();
    }

    click0() {
        this.amount = 0;
    }

    clickMax() {
        this.amount = this.maxVotes;
    }

}