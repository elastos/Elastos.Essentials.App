import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { WalletAccountType } from 'src/app/wallet/model/walletaccount';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { VoteContent, VoteType } from 'src/app/wallet/services/spv.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
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

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        private voteService: VoteService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
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
        this.proposalDetailFetched = true;

        if (this.proposalDetail) {
            const stakeAmount = this.voteService.sourceSubwallet.getRawBalance().minus(this.votingFees());
            if (!stakeAmount.isNegative()) {
                this.maxVotes = Math.floor(stakeAmount.dividedBy(Config.SELAAsBigNumber).toNumber());
            }
        }
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async voteAgainstProposal() {
        if (await this.goTransaction()) {
            await this.exitIntentWithSuccess();
        }
        else {
            await this.exitIntentWithError();
        }
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }


    async goTransaction(): Promise<boolean> {
        if (this.voteService.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.multi-sign-reject-voting');
            return false;
        }
        // Request the wallet to publish our vote.
        else if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        else if (this.amount > this.maxVotes) {
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount == 0) {
            return false;
        }

        const stakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createVoteCRProposalTransaction(stakeAmount.toString());
        return true;
    }

    /**
     * Fees needed to pay for the vote transaction. They have to be deduced from the total amount otherwise
     * funds won't be enough to vote.
     */
    votingFees(): number {
        return 100000; // SELA: 0.001ELA
    }

    async createVoteCRProposalTransaction(voteAmount) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndSendingProposalResponse = true;
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);

        let votes = {};
        votes[this.onGoingCommand.data.proposalHash] = voteAmount; // Vote with everything
        Logger.log('wallet', "Vote:", votes);

        let crVoteContent: VoteContent = {
            Type: VoteType.CRCProposal,
            Candidates: votes
        }

        const voteContent = [crVoteContent];
        const rawTx = await this.voteService.sourceSubwallet.createVoteTransaction(
            voteContent,
            '', //memo
        );

        try {
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

}