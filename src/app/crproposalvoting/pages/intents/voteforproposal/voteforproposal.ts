import { Component, ViewChild } from '@angular/core';
import { CROperationsService, CRWebsiteCommand } from '../../../services/croperations.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletAccountType } from 'src/app/wallet/model/WalletAccount';
import { ProposalService } from 'src/app/crproposalvoting/services/proposal.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { ProposalDetails } from 'src/app/crproposalvoting/model/proposal-details';
import { Config } from 'src/app/wallet/config/Config';
import { Util } from 'src/app/model/util';
import { App } from 'src/app/model/app.enum';
import { Candidates, VoteContent, VoteType } from 'src/app/wallet/model/SPVWalletPluginBridge';

type VoteForProposalCommand = CRWebsiteCommand & {
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

    private voteForProposalCommand: VoteForProposalCommand;
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;
    public signingAndSendingSuggestionResponse = false;
    public maxVotes: number = 0;
    public amount: number = 0;

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletManager,
        private voteService: VoteService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.vote-proposal'));
        this.voteForProposalCommand = this.crOperations.onGoingCommand as VoteForProposalCommand;

        try {
            // Fetch more details about this proposal, to display to the user
            this.proposalDetails = await this.proposalService.fetchProposalDetails(this.voteForProposalCommand.data.proposalHash);
            Logger.log('crproposal', "proposalDetails", this.proposalDetails);
            this.proposalDetailsFetched = true;
        }
        catch (err) {
            Logger.error('crproposal', 'VoteForProposalPage ionViewDidEnter error:', err);
        }

        const stakeAmount = this.voteService.sourceSubwallet.balance.minus(this.votingFees());
        if (!stakeAmount.isNegative()) {
            this.maxVotes = Math.floor(stakeAmount.dividedBy(Config.SELAAsBigNumber).toNumber());
        }
    }

    cancel() {
        this.globalNav.navigateBack();
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
        this.signingAndSendingSuggestionResponse = true;
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);

        let votes = {};
        votes[this.voteForProposalCommand.data.proposalHash] = voteAmount; // Vote with everything
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
            await this.voteService.signAndSendRawTransaction(rawTx, App.CRPROPOSAL_VOTING);
        }
        catch (e) {
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', "Sorry, unable to vote. Your crproposal can't be vote for now. ");
        }

        this.signingAndSendingSuggestionResponse = false;
    }

}