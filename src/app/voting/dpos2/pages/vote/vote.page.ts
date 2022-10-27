import { formatNumber } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StakeService, VoteType } from 'src/app/voting/staking/services/stake.service';
import { Config } from 'src/app/wallet/config/Config';
import { DPoS2Node } from '../../model/nodes.model';
import { DPoS2Service } from '../../services/dpos2.service';


@Component({
    selector: 'app-vote',
    templateUrl: './vote.page.html',
    styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public dataFetched = false;
    public signingAndTransacting = false;
    public isKeyboardHide = true;

    constructor(
        public uxService: UXService,
        public dpos2Service: DPoS2Service,
        private globalNav: GlobalNavService,
        private stakeService: StakeService,
        private storage: GlobalStorageService,
        private globalNative: GlobalNativeService,
        public theme: GlobalThemeService,
        private voteService: VoteService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
        public keyboard: Keyboard,
        public zone: NgZone,
    ) { }

    public castingVote = false;
    public votesCasted = false;
    public totalEla = 0;
    private votedEla = 0;
    private toast: any;

    public nodeVotes: { [publicKey: string]: number } = {}; // Map of CID -> votes - for ion-input items temporary model (before applying to crCouncilService.selectedCandidates.userVotes)
    // public candidatesPercentages: { [cid: string]: number } = {}; // Map of CID -> percentage (0-10000) for 2 decimals precision - for ion-range items

    public testValue = 0;
    public overflow = false;

    private selectedNodes = [];

    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async ionViewWillEnter() {
        this.dataFetched = false;

        //this.titleBar.setBackgroundColor("#732CCE");
        //this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('dposvoting.dpos2-voting'));
        await this.dpos2Service.init();

        await this.stakeService.getVoteRights();

        this.totalEla = this.stakeService.votesRight.votes[VoteType.DPoSV2];

        this.dpos2Service._nodes.forEach(node => {
            // if (node.isChecked === true) {
                if (!node.userVotes) {
                    node.userVotes = 0;
                    node.userStakeDays = 10;
                }
                this.selectedNodes.push(node);
            // }
        });

        Logger.log(App.DPOS_VOTING, 'My votes', this.selectedNodes);
        // Initialize node percentages with default values
        this.selectedNodes.forEach((node) => {
            //console.log("node.userVotes", node.userVotes, Number.isInteger(node.userVotes))
            this.nodeVotes[node.ownerpublickey] = Number.isInteger(node.userVotes) ? node.userVotes : 0;
            if (isNaN(this.nodeVotes[node.ownerpublickey])) {
                this.nodeVotes[node.ownerpublickey] = 0;
            }
        });
        this.getVotedCount();

        //console.log("this.nodeVotes", this.nodeVotes)

        Logger.log(App.DPOS_VOTING, 'ELA Balance', this.totalEla);

        this.dataFetched = true;

        if (this.dataFetched) {
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
        }

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
        let votes = Math.floor(this.totalEla / this.selectedNodes.length);
        Logger.log(App.DPOS_VOTING, 'Equally distributed votes', votes);
        this.selectedNodes.forEach((node) => {
            node.userVotes = votes;
            this.nodeVotes[node.ownerpublickey] = votes;
        });
        this.getVotedCount();
    }

    fixVotes(votes: string) {
        return parseInt(votes);
    }

    /****************** Cast Votes *******************/
    async cast() {
        let currentHeight = await this.voteService.getCurrentHeight();
        let votedCandidates = [];
        this.selectedNodes.map((node) => {
            if (node.userVotes > 0 && node.userStakeDays >= 10) {
                // let userVotes = node.userVotes * 100000000;
                let userVotes = Util.accMul(node.userVotes, Config.SELA);
                let _vote = {
                    Candidate: node.ownerpublickey,
                    Votes: userVotes,
                    Locktime: currentHeight + node.userStakeDays * 720 };
                votedCandidates.push(_vote);
            }
            else {
                node.userVotes = 0;
            }
        });

        if (Object.keys(votedCandidates).length === 0) {
            void this.globalNative.genericToast('crcouncilvoting.pledge-some-ELA-to-candidates');
        }
        else if (this.votedEla > this.totalEla) {
            void this.globalNative.genericToast('crcouncilvoting.not-allow-pledge-more-than-own');
        }
        else {
            Logger.log(App.DPOS_VOTING, votedCandidates);
            await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'crcouncil', 'votes', this.selectedNodes);
            this.castingVote = true;
            this.votesCasted = false;
            await this.createVoteCRTransaction(votedCandidates);
        }
    }

    /****************** Misc *******************/
    setInputDefault(event) {
        Logger.log(App.DPOS_VOTING, event);
    }

    getElaRemainder() {
        this.votedEla = 0;
        this.selectedNodes.map((can) => {
            this.votedEla += can.userVotes;
        });
        let remainder = this.totalEla - this.votedEla;
        return remainder.toFixed(2);
    }

    /**
     * Percentage of user's votes distribution for this given node, in a formatted way.
     * eg: 3.52 (%)
     */
    public getDisplayableVotePercentage(node: DPoS2Node) {
        if (this.totalEla === 0)
            return "0.00";

        return formatNumber(node.userVotes * 100 / this.totalEla, "en", "0.2-2");
    }

    /**
     * Returns the number of ELA currently distributed to candidates for voting
     */
    public getDistributedEla(): number {
        return this.selectedNodes.reduce((prev, c) => prev + parseInt(c.userVotes as any), 0) || 0;
    }

    public onInputFocus(event, node: DPoS2Node) {
        this.nodeVotes[node.ownerpublickey] = null; // Clear input field for convenient typing
    }

    // Event triggered when the text input loses the focus. At this time we can recompute the
    // distribution.
    public onInputBlur(event, node: DPoS2Node) {
        //console.log("onInputBlur", node)
        this.getVotedCount();
    }

    async createVoteCRTransaction(votes: any) {
        this.signingAndTransacting = true;
        Logger.log('wallet', 'Creating vote transaction with votes', votes);


        let voteContentInfo: VotesContentInfo = {
            VoteType: VoteContentType.DposV2,
            VotesInfo: votes
        };

        const payload: VotingInfo = {
            Version: 0,
            Contents: [voteContentInfo]
          };

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                payload,
                '', //memo
            );
            await this.globalNative.hideLoading();
            Logger.log('wallet', "rawTx:", rawTx);

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS_VOTING, "/dpos2/menu/list");
            if (ret) {
                this.voteService.toastSuccessfully('voting.vote');
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }

        this.castingVote = false;
        this.signingAndTransacting = false;
    }

    public getVotedCount() {
        var count = 0;
        this.selectedNodes.forEach((node) => {
            if (isNaN(this.nodeVotes[node.ownerpublickey])) {
                this.nodeVotes[node.ownerpublickey] = 0;
            }
            count += this.nodeVotes[node.ownerpublickey];
        });
        this.overflow = count > this.totalEla || this.totalEla == 0;
        this.votedEla = count;
    }

    getDate(days: number): string {
        var stakeTimestamp = new Date().getTime() / 1000 + days * 24 * 60 * 60;
        return this.uxService.formatDate(stakeTimestamp);
    }

    stakeMore() {
        void this.globalNav.navigateTo(App.STAKING, "/staking/stake");
    }
}
