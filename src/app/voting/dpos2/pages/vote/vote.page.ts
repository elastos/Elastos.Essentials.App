import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { VoteContentType, VotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
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
    public showConfirmPopup = false;

    constructor(
        public uxService: UXService,
        public dpos2Service: DPoS2Service,
        private globalNav: GlobalNavService,
        public stakeService: StakeService,
        private storage: GlobalStorageService,
        private globalNative: GlobalNativeService,
        public theme: GlobalThemeService,
        private voteService: VoteService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
        public keyboard: Keyboard,
        public zone: NgZone,
    ) { }

    public votesCasted = false;
    public totalEla = 0;
    private votedEla = 0;
    private toast: any;

    public testValue = 0;
    public overflow = false;
    public less_than_10_days = false;

    private selectedNodes = [];
    public currentHeight = 0;

    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async ionViewWillEnter() {
        this.dataFetched = false;

        this.titleBar.setTitle(this.translate.instant('dposvoting.dpos2-voting'));

        await this.stakeService.getVoteRights();
        if (this.stakeService.votesRight.totalVotesRight > 0) {
            this.totalEla = parseFloat(this.stakeService.votesRight.remainVotes[VoteType.DPoSV2].toFixed(2));
        }
        else {
            this.totalEla = 0;
        }

        this.selectedNodes = [];
        this.dpos2Service.activeNodes.forEach(node => {
            if (node.isChecked === true) {
                if (!node.userVotes) {
                    node.userVotes = 0;
                    node.userStakeDays = 10;
                }
                this.selectedNodes.push(node);
            }
        });

        Logger.log(App.DPOS2, 'My votes', this.selectedNodes);

        this.getVotedCount();
        this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();

        Logger.log(App.DPOS2, 'Total stake remain ELA', this.totalEla);

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
        this.votesCasted = false;

        if (this.toast) {
            this.toast.dismiss();
        }
    }

    /****************** Cast Votes *******************/
    async cast() {
        this.signingAndTransacting = true;

        try {
            this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
            let votedCandidates = [];

            let stakeDaysExceedingSixMonths = false;
            const stakeDaysWarningThreshold = 180;
            let maxStakeDays = 0;
            for (const node of this.selectedNodes) {
                if (node.userVotes > 0) {
                    if (node.userStakeDays < 10) {
                        this.globalNative.genericToast('dposvoting.stake-days-less-than-10');
                        return;
                    }

                    if (node.userStakeDays > 1000) {
                        this.globalNative.genericToast('voting.vote-max-deadline');
                        return;
                    }

                    var userStakeDays = node.userStakeDays;
                    let locktime = 0
                    // MAX stake days
                    if (userStakeDays == node.stakeDays) {
                        locktime = node.stakeuntil;
                    } else {
                        locktime = this.currentHeight + this.getStakeBlockCount(userStakeDays);
                        if (locktime > node.stakeuntil) {
                            this.globalNative.genericToast('dposvoting.stake-days-more-than-stakeuntil');
                            return;
                        }
                    }

                    if (userStakeDays > stakeDaysWarningThreshold) {
                      stakeDaysExceedingSixMonths = true;
                      maxStakeDays = maxStakeDays > userStakeDays ? maxStakeDays : userStakeDays;
                    }

                    // let userVotes = node.userVotes * 100000000;
                    let userVotes = Util.accMul(node.userVotes, Config.SELA);
                    let _vote = {
                        Candidate: node.ownerpublickey,
                        Votes: userVotes,
                        Locktime: locktime };
                    votedCandidates.push(_vote);
                }
                else {
                    node.userVotes = 0;
                }
            };

            if (Object.keys(votedCandidates).length === 0) {
                void this.globalNative.genericToast('dposvoting.pledge-some-votes-to-nodes');
            }
            else if (this.votedEla > this.totalEla) {
                void this.globalNative.genericToast('crcouncilvoting.not-allow-pledge-more-than-own');
            }
            else {
                this.showConfirmPopup = true;
                let confirmed = await this.popupProvider.showConfirmationPopup(
                        this.translate.instant('dposvoting.confirm-title'),
                        this.translate.instant('dposvoting.confirm-prompt'),
                        this.translate.instant('dposvoting.confirm-button-text'),
                        "/assets/identity/default/publishWarning.svg");
                this.showConfirmPopup = false;
                if (!confirmed) {
                    return;
                }

                // if the vote duration is longer than 6 months, need to double confirm
                if (stakeDaysExceedingSixMonths) {
                  this.showConfirmPopup = true;
                  let confirmed = await this.popupProvider.showConfirmationPopup(
                          this.translate.instant('dposvoting.double-confirm-title'),
                          this.translate.instant('dposvoting.pledge-period-too-long-confirm-prompt', {days: maxStakeDays}),
                          this.translate.instant('common.continue'),
                          "/assets/identity/default/publishWarning.svg");
                  this.showConfirmPopup = false;
                  if (!confirmed) {
                      return;
                  }
                }

                Logger.log(App.DPOS2, votedCandidates);
                this.votesCasted = false;
                await this.createVoteCRTransaction(votedCandidates);
            }
        }
        catch (e) {
            Logger.warn(App.DPOS2, 'Vote exception:', e)
        }
        finally {
            this.signingAndTransacting = false;
        }
    }

    /****************** Misc *******************/
    setInputDefault(event) {
        Logger.log(App.DPOS2, event);
    }

    getElaRemainder() {
        this.votedEla = 0;
        this.selectedNodes.map((node) => {
            this.votedEla += node.userVotes;
        });
        let remainder = this.totalEla - this.votedEla;
        return remainder.toFixed(2);
    }

    /**
     * Percentage of user's votes distribution for this given node, in a formatted way.
     * eg: 3.52 (%)
     */
    public getVotesPercentage(node: DPoS2Node) {
        return this.uxService.getPercentage(node.userVotes, this.totalEla);
    }

    // Event triggered when the text input loses the focus. At this time we can recompute the value.
    public onInputVotesFocus(node: DPoS2Node) {
        if (node.userVotes == 0) {
            node.userVotes = null;
        }
    }

    public onInputVotesBlur(node: DPoS2Node) {
        if (node.userVotes == null) {
            node.userVotes = 0;
        }
        this.getVotedCount();
    }

    public onInputVotesChange(node: DPoS2Node) {
        if (node.userVotes != null) {
            this.getVotedCount();
        }
    }

    public onInputDaysFocus(node: DPoS2Node) {
        // node.userStakeDays = null;
    }

    public onInputDaysBlur(node: DPoS2Node) {
        if (node.userStakeDays == null) {
            node.userStakeDays = 10;
        }
        node.userStakeDays = Math.floor(node.userStakeDays);
    }

    // public onInputDaysChange(node: DPoS2Node) {
    //     if (node.userStakeDays != null) {
    //         node.userStakeDays = Math.floor(node.userStakeDays);
    //     }
    // }

    // private checkInputDays() {
    //     this.less_than_10_days = false;

    //     this.selectedNodes.forEach((node) => {
    //         if (node.userStakeDays < 10) {
    //             this.less_than_10_days = true;
    //         }
    //     });
    // }

    public checkInputDays(node: DPoS2Node): boolean {
        var userStakeDays = node.userStakeDays || 0;

        if (userStakeDays < 10) {
            return true;
        }

        if (userStakeDays > 1000) {
            return true;
        }

        // MAX stake days
        if (userStakeDays == node.stakeDays) {
            return false;
        }

        let locktime = this.currentHeight + this.getStakeBlockCount(userStakeDays)
        return (locktime > node.stakeuntil);
    }

    async createVoteCRTransaction(votes: any) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

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
            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                payload,
                '', //memo
            );
            // Logger.log('wallet', "rawTx:", rawTx);

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS2, "/dpos2/menu/list");
            if (ret) {
                this.voteService.toastSuccessfully('voting.vote');
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
    }

    public getVotedCount() {
        var count = 0;
        this.selectedNodes.forEach((node) => {
            count += node.userVotes;
        });
        this.overflow = count > this.totalEla || this.totalEla == 0;
        this.votedEla = count;
    }

    public getStakeBlockCount(userStakeDays: number) {
      var userStakeDays = userStakeDays;
      if (this.voteService.isMuiltWallet() && (userStakeDays < 1000)) {
          userStakeDays++;
      }

      let buffer = 5; // Add 10 minutes for time buffer if the stake days is 10.
      if (userStakeDays >= 11) {
          buffer = 0;
      }

      return userStakeDays * 720 + buffer;
    }

    stakeMore() {
        void this.globalNav.navigateTo(App.STAKING, "/staking/stake");
    }

    showIntegerPart(value: number) {
        return Math.ceil(value);
    }

    shouldShowHelp(node: any) {
      if (node.dposv2votesNumber > 90000) {
          return true;
      }
      return false;
    }

    showHelp(event): Promise<any> {
        return this.popupProvider.showHelp(event, 'dposvoting.vote-warning')
    }

    calcVoteRights(node: DPoS2Node) {
        return Math.floor(node.userVotes * Math.log10(node.userStakeDays));
    }

    setMaxStakeDays(node: DPoS2Node) {
        if (node.stakeDays <= 1000) {
            node.userStakeDays = node.stakeDays;
        } else {
            node.userStakeDays = 1000;
        }
    }
}
