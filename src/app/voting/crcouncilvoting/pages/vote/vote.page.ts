import { formatNumber } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
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
import { SelectedCandidate } from "../../model/selected.model";
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

    public candidatesVotes: { [cid: string]: number } = {}; // Map of CID -> votes - for ion-input items temporary model (before applying to candidatesService.selectedCandidates.userVotes)
    public candidatesPercentages: { [cid: string]: number } = {}; // Map of CID -> percentage (0-10000) for 2 decimals precision - for ion-range items

    public testValue = 0;

    ngOnInit() {
        Logger.log('crcouncil', 'My Candidates', this.candidatesService.selectedCandidates);
        this.totalEla = this.voteService.getMaxVotes();
        Logger.log('crcouncil', 'ELA Balance', this.totalEla);

        // Initialize candidate percentages with default values
        this.candidatesService.candidates.forEach(c => {
            this.candidatesVotes[c.cid] = 0;
            this.candidatesPercentages[c.cid] = 0;
        })
    }

    ngOnDestroy() {
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor("#732CCE");
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
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

    distributeEqually() {
        let votes = Math.floor(this.totalEla / this.candidatesService.selectedCandidates.length);
        Logger.log('crcouncil', 'Equally distributed votes', votes);
        this.candidatesService.selectedCandidates.forEach((candidate) => {
            candidate.userVotes = votes;
            this.candidatesVotes[candidate.cid] = votes;
            this.updateCandidatePercentVotesMap(candidate, votes);
        });
    }

    fixVotes(votes: string) {
        return parseInt(votes);
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

    /**
     * Percentage of user's votes distribution for this given candidate, in a formatted way.
     * eg: 3.52 (%)
     */
    public getDisplayableVotePercentage(candidate: SelectedCandidate) {
        if (this.totalEla === 0)
            return "0.00";

        return formatNumber(candidate.userVotes * 100 / this.totalEla, "en", "0.2-2");
    }

    /**
     * Returns the number of ELA currently distributed to candidates for voting
     */
    public getDistributedEla(): number {
        return this.candidatesService.selectedCandidates.reduce((prev, c) => prev + parseInt(c.userVotes as any), 0) || 0;
    }

    public onInputFocus(event, candidate: SelectedCandidate) {
        this.candidatesVotes[candidate.cid] = null; // Clear input field for convenient typing
    }

    // Event triggered when the text input loses the focus. At this time we can recompute the
    // distribution.
    public onInputBlur(event, candidate: SelectedCandidate) {
        //console.log("onInputBlur", candidate)

        // For a parseInt() to fix keypad mistakes (eg: 123.45)
        let targetValue = parseInt(this.candidatesVotes[candidate.cid] as any) || 0;
        this.recomputeVotes(candidate, targetValue, false);
    }

    // Event triggered by ngModelChange (called only for the ion-range touched by user), and not
    // by ionChange (because ionChange is called when programatically updating ion-range value tooand we
    // don't want this).
    public onSliderChanged(value: number, candidate: SelectedCandidate) {
        //console.log("onSliderChanged", value, this.candidatesPercentages, candidate.cid)

        // Progress bar is between 0-10000 (<-> 0-100.00%), this is a percentage of total ELA voting power
        let newCandidateValue = Math.round(new BigNumber(this.totalEla).multipliedBy(value).dividedBy(10000).toNumber());
        this.recomputeVotes(candidate, newCandidateValue, true);
    }

    /**
     * Based on the given number of votes, recompute the progress bar position for a usercandidate
     */
    private updateCandidatePercentVotesMap(candidate: SelectedCandidate, votes: number) {
        this.candidatesPercentages[candidate.cid] = new BigNumber(votes).multipliedBy(10000).dividedBy(this.totalEla).toNumber();
        //console.log("Updating progress percentage", candidate.cid, this.candidatesPercentages[candidate.cid])
    }

    private recomputeVotes(modifiedCandidate: SelectedCandidate, targetVoteValue: number, triggeredByIonRangeChange: boolean) {
        let prevCandidateValue = modifiedCandidate.userVotes;
        let diffEla = targetVoteValue - prevCandidateValue;

        //console.log("diffEla", diffEla, this.candidatesVotes[modifiedCandidate.cid], modifiedCandidate.userVotes, prevCandidateValue, targetVoteValue)

        if (diffEla < 0) {
            // User has decreased the candidate votes, we recompute only the current candidate
            modifiedCandidate.userVotes += diffEla; // Decreases as diffEla is negative
            this.candidatesVotes[modifiedCandidate.cid] = modifiedCandidate.userVotes;

            if (!triggeredByIonRangeChange) // Update progress only if not triggered by ion-range to avoid double update
                this.updateCandidatePercentVotesMap(modifiedCandidate, modifiedCandidate.userVotes);
        }
        else {
            // User has increased the candidate votes. If the currently distributed ELA + the new

            let distributedEla = this.getDistributedEla(); // Distributed ELA before this reallocation
            //console.log("distributedEla", distributedEla)
            let overflowELA = Math.max(0, (distributedEla + diffEla) - this.totalEla);

            modifiedCandidate.userVotes = targetVoteValue;
            this.candidatesVotes[modifiedCandidate.cid] = modifiedCandidate.userVotes;

            if (!triggeredByIonRangeChange) // Update progress only if not triggered by ion-range to avoid double update
                this.updateCandidatePercentVotesMap(modifiedCandidate, modifiedCandidate.userVotes);

            // Take out overflowELA from each other candidate
            // Process in several loop because some candidates can't remove the equally distributed "removedAmount"
            // and their is a rest to continue to deduce from non 0 candidates in several steps.
            let reallyRemovedAmount = 0;
            do {
                let splitInto = this.numberOfNonZeroVotesCandidates(modifiedCandidate); // Distribute among all selected candidates minus the currently modified candidate
                let removedAmount = Math.ceil(overflowELA / splitInto); // Remove the same number of votes from each other candidate
                //console.log("split into", splitInto, "overflowELA", overflowELA, "removedAmount", removedAmount, "reallyRemovedAmount", reallyRemovedAmount);
                for (let c of this.candidatesService.selectedCandidates) {
                    if (c.cid === modifiedCandidate.cid || c.userVotes == 0)
                        continue;

                    //console.log("distrib", c.cid, "votes before", c.userVotes, "removedAmount", removedAmount)

                    let removedVotes = Math.min(c.userVotes, removedAmount);
                    c.userVotes -= removedVotes;
                    this.candidatesVotes[c.cid] = c.userVotes;
                    this.updateCandidatePercentVotesMap(c, c.userVotes);

                    reallyRemovedAmount += removedVotes;
                }
            }
            while (reallyRemovedAmount < overflowELA);
        }
    }

    /**
     * Number of candidates with at least 1 vote.
     */
    private numberOfNonZeroVotesCandidates(excludedCandidate: SelectedCandidate): number {
        let count = 0;
        this.candidatesService.selectedCandidates.map(c => {
            if (c.cid !== excludedCandidate.cid && c.userVotes > 0)
                count++;
        });
        return count;
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
