import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { VoteContent, VoteType } from 'src/app/wallet/model/SPVWalletPluginBridge';
import { CandidatesService } from '../../services/candidates.service';

@Component({
    selector: 'app-vote',
    templateUrl: './vote.page.html',
    styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    constructor(
        public candidatesService: CandidatesService,
        private storage: GlobalStorageService,
        private globalNative: GlobalNativeService,
        public theme: GlobalThemeService,
        private voteService: VoteService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
    ) { }

    public castingVote = false;
    public votesCasted = false;
    public totalEla = 0;
    private votedEla = 0;
    private toast: any;
    public signingAndTransacting = false;

    ngOnInit() {
        Logger.log('crcouncil', 'My Candidates', this.candidatesService.selectedCandidates);
        this.totalEla =this.voteService.getMaxVotes();
        Logger.log('crcouncil', 'ELA Balance', this.totalEla);
    }

    ngOnDestroy() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.my-candidates'));
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {
        this.castingVote = false;
        this.votesCasted = false;

        if (this.toast) {
            this.toast.dismiss();
        }
    }

    distribute() {
        let votes = this.totalEla / this.candidatesService.selectedCandidates.length;
        Logger.log('crcouncil', 'Distributed votes', votes);
        this.candidatesService.selectedCandidates.forEach((candidate) => {
            candidate.userVotes = votes;
        });
    }

    /****************** Cast Votes *******************/
    async cast() {
        let votedCandidates = {};
        this.candidatesService.selectedCandidates.map((candidate) => {
            if (candidate.userVotes && candidate.userVotes > 0) {
                // let userVotes = candidate.userVotes * 100000000;
                let userVotes = Util.accMul(candidate.userVotes, Config.SELA)
                let _candidate = { [candidate.cid]: userVotes.toFixed(0) } //SELA, can't with fractions
                votedCandidates = { ...votedCandidates, ..._candidate }
            } else {
                candidate.userVotes = 0;
            }
        });

        if (Object.keys(votedCandidates).length === 0) {
            void this.globalNative.genericToast('crcouncilvoting.pledge-some-ELA-to-candidates');
        }
        else if (this.votedEla > this.totalEla) {
            void this.globalNative.genericToast('crcouncilvoting.not-allow-pledge-more-than-own');
        }
        else {
            Logger.log('crcouncil', votedCandidates);
            await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', this.candidatesService.selectedCandidates);
            this.castingVote = true;
            this.votesCasted = false;
            await this.createVoteCRTransaction(votedCandidates);
        }
    }

    /****************** Misc *******************/
    setInputDefault(event) {
        Logger.log('crcouncil', event);
    }

    getElaRemainder() {
        this.votedEla = 0;
        this.candidatesService.selectedCandidates.map((can) => {
            this.votedEla += can.userVotes;
        });
        let remainder = this.totalEla - this.votedEla;
        return remainder.toFixed(2);
    }

    async createVoteCRTransaction(votes: any) {
        this.signingAndTransacting = true;
        Logger.log('wallet', 'Creating vote transaction with votes', votes);

        let crVoteContent: VoteContent = {
            Type: VoteType.CRC,
            Candidates: votes
        }

        try {
            const voteContent = [crVoteContent];
            const rawTx = await this.voteService.sourceSubwallet.createVoteTransaction(
                voteContent,
                '', //memo
            );
            Logger.log('wallet', "rawTx:", rawTx);

            await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, "/crcouncilvoting/candidates");
        }
        catch (e) {
            await this.popupProvider.ionicAlert('crcouncilvoting.impeach-council-member', "Sorry, unable to vote. Your crproposal can't be vote for now. ");
        }

        this.signingAndTransacting = false;
    }
}
