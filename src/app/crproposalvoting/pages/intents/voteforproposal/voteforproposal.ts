import { Component, ViewChild } from '@angular/core';
import { CROperationsService, CRWebsiteCommand } from '../../../services/croperations.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletAccountType } from 'src/app/wallet/model/WalletAccount';

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

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletManager,
        private voteService: VoteService,
    ) {

    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.vote-proposal'));
        this.voteForProposalCommand = this.crOperations.onGoingCommand as VoteForProposalCommand;
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
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'multi sign reject voting');
            return false;
        }
        // Request the wallet to publish our vote.
        else if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }

        const stakeAmount = this.voteService.sourceSubwallet.balance.minus(this.votingFees());
        if (stakeAmount.isNegative()) {
            Logger.log('wallet', 'CRProposalVoteAgainstPage: Not enough balance:', stakeAmount.toString());
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'wallet.amount-null');
            return false;
        }

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
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);

        let invalidCandidates = await this.walletManager.computeVoteInvalidCandidates(this.voteService.masterWalletId);

        // The transfer "votes" array must contain exactly ONE entry: the voted proposal
        // TODO: don't use a votes array in a global transfer object. Use a custom object for CR proposal voting.
        let votes = {};
        votes[this.voteForProposalCommand.data.proposalHash] = voteAmount; // Vote with everything
        Logger.log('wallet', "Vote:", votes);

        const rawTx = await this.walletManager.spvBridge.createVoteTransaction(
            this.voteService.masterWalletId,
            this.voteService.chainId,
            '',
            JSON.stringify(votes),
            '', //memo
            JSON.stringify(invalidCandidates));

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

}