import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { VoteContent, VoteType } from 'src/app/wallet/model/SPVWalletPluginBridge';
import { WalletAccountType } from 'src/app/wallet/model/walletaccount';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-impeach',
    templateUrl: './impeach.page.html',
    styleUrls: ['./impeach.page.scss'],
})
export class ImpeachCRMemberPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public member: any = {};
    public signingAndTransacting = false;
    public maxVotes = 0;
    public amount: number;
    private updatedBalance = false;

    constructor(
        public theme: GlobalThemeService,
        public translate: TranslateService,
        private popoverCtrl: PopoverController,
        private route: ActivatedRoute,
        private globalNav: GlobalNavService,
        public crCouncilService: CRCouncilService,
        private voteService: VoteService,
        public popupProvider: GlobalPopupService,
    ) {

    }

    async ionViewWillEnter() {
        if (!this.updatedBalance) {
            await this.voteService.sourceSubwallet.updateBalanceSpendable();
            this.maxVotes = this.voteService.getMaxVotes();
            this.updatedBalance = true;
        }
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.impeachment'));
        this.member = this.crCouncilService.selectedMember;
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    // async voteImpeachCRMember() {
    //     await this.goTransaction();
    // }

    async goTransaction(): Promise<boolean> {
        if (this.voteService.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            await this.popupProvider.ionicAlert("common.error", 'crproposalvoting.multi-sign-reject-voting');
            return false;
        }
        // Request the wallet to publish our vote.
        else if (!await this.voteService.checkPendingBalance()) {
            return false;
        }
        if (!this.amount) {
            await this.popupProvider.ionicAlert("common.error", 'voting.vote-invalid');
            return false;
        }
        else if (this.amount > this.maxVotes) {
            await this.popupProvider.ionicAlert("common.error", 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount <= 0) {
            await this.popupProvider.ionicAlert("common.error", 'crproposalvoting.less-than-equal-zero-votes');
            return false;
        }

        const stakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createVoteImpeachTransaction(stakeAmount.toString());
        return true;
    }

    /**
     * Fees needed to pay for the vote transaction. They have to be deduced from the total amount otherwise
     * funds won't be enough to vote.
     */
    votingFees(): number {
        return 100000; // SELA: 0.001ELA
    }

    async createVoteImpeachTransaction(voteAmount) {
        this.signingAndTransacting = true;
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount);

        let votes = {};
        votes[this.member.cid] = voteAmount; // Vote with everything
        Logger.log('wallet', "Vote:", votes);

        let crVoteContent: VoteContent = {
            Type: VoteType.CRCImpeachment,
            Candidates: votes
        }

        const voteContent = [crVoteContent];
        const rawTx = await this.voteService.sourceSubwallet.createVoteTransaction(
            voteContent,
            '', //memo
        );
        Logger.log('wallet', "rawTx:", rawTx);


        try {
            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('crcouncilvoting.impeachment');
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }

        this.signingAndTransacting = false;
    }

    click0() {
        this.amount = 0;
    }

    clickMax() {
        this.amount = this.maxVotes;
    }

}



