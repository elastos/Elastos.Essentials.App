import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { VoteContent, VoteType } from 'src/app/wallet/model/elastos.types';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
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
    public isKeyboardHide = true;

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
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

            this.maxVotes = await this.voteService.getMaxVotes();
        }
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
                break;
            case WalletType.LEDGER:
                await this.popupProvider.ionicAlert('wallet.text-warning', 'voting.ledger-reject-voting');
                return;
            case WalletType.MULTI_SIG_STANDARD:
            case WalletType.MULTI_SIG_EVM_GNOSIS:
                await this.popupProvider.ionicAlert('wallet.text-warning', 'voting.multi-sign-reject-voting');
                return;
            default:
                // Should not happen.
                Logger.error('wallet', 'Not support, pls check the wallet type:', this.voteService.sourceSubwallet.masterWallet.type)
                return;
        }

        // Request the wallet to publish our vote.
        if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        else if (this.amount > this.maxVotes) {
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount <= 0) {
            await this.popupProvider.ionicAlert('crproposalvoting.vote-proposal', 'crproposalvoting.less-than-equal-zero-votes');
            return false;
        }

        const stakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createVoteCRProposalTransaction(stakeAmount.toString());
        return true;
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

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createVoteTransaction(
                voteContent,
                '', //memo
            );
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

    click0() {
        this.amount = 0;
    }

    clickMax() {
        this.amount = this.maxVotes;
    }

}