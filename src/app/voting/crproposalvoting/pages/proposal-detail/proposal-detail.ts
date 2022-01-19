import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import marked from 'marked';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { MileStoneOptionsComponent } from '../../components/milestone-options/milestone-options.component';
import { ProposalDetails, VoteResultType } from '../../model/proposal-details';
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { CRCommandType, CROperationsService } from '../../services/croperations.service';
import { ProposalService } from '../../services/proposal.service';
import { UXService } from '../../services/ux.service';

type MergedProposalInfo = ProposalSearchResult & ProposalDetails;

@Component({
    selector: 'page-proposal-detail',
    templateUrl: 'proposal-detail.html',
    styleUrls: ['./proposal-detail.scss']
})
export class ProposalDetailPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    proposal: ProposalDetails;
    proposalDetails = [];
    proposalDetailFetched = false;

    timeActive = false;
    rejectActive = false;

    activeTab = 1;
    totalBudget = 0;
    isCRMember = false;
    isOwner = false;

    commandName: string;
    buttonLabel: string;
    public Config = Config;
    public crvotes = {approve: 0, reject: 0, abstain: 0};
    public proposalHash: string;
    private commandReturnSub: Subscription = null;

    private popover: any = null;

    constructor(
        public uxService: UXService,
        private router: Router,
        private proposalService: ProposalService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        public voteService: VoteService,
        private crOperations: CROperationsService,
        protected popoverCtrl: PopoverController,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            this.proposalHash = navigation.extras.state.proposalHash;
            Logger.log('CRProposal', 'Proposal details id', this.proposalHash);
        }
    }

    async init() {
        this.proposal = null;
        this.proposalDetailFetched = false;
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.loading-proposal'));

        try {
            this.isCRMember = await this.voteService.isCRMember();
            this.proposal = await this.proposalService.fetchProposalDetails(this.proposalHash);
            Logger.log('CRProposal', "proposal", this.proposal);

            this.isOwner = Util.isSelfDid(this.proposal.did);
            // this.isOwner = true;

            //Set last tracking for show on page
            if (this.proposal.milestone) {
                for (let item of this.proposal.milestone) {
                    if (item.tracking && item.tracking.length > 0) {
                        item.lastTrackingInfo = item.tracking[0];
                    }
                }
            }

            //Get total budget
            if (this.proposal.budgets) {
                for (let i = 0; i < this.proposal.budgets.length; i++) {
                    let budget = this.proposal.budgets[i];
                    budget.type = budget.type.toLowerCase();
                    this.totalBudget += parseInt(budget.amount);

                    //Set last tracking for show on page
                    if (this.proposal.milestone && this.proposal.milestone[i]) {
                        if (this.proposal.status == 'voteragreed') {
                            await this.setLastTracking(i);
                        }
                        else if (this.isOwner && this.proposal.status == 'finished' && budget.status == 'Withdrawable') {
                            let milestone = this.proposal.milestone[i];
                            milestone.lastTracking = {command: 'withdraw', stage: budget.stage};
                        }
                    }
                }
            }

            //Get cr votes
            this.crvotes = {approve: 0, reject: 0, abstain: 0};
            if (this.proposal.crVotes) {
                for (let vote of this.proposal.crVotes) {
                    switch (vote.result) {
                        case "approve":
                            this.crvotes.approve += 1;
                            break;
                        case "reject":
                            this.crvotes.reject += 1;
                            break;
                        case "abstain":
                            this.crvotes.abstain += 1;
                            break;
                    }

                    vote.avatar = this.proposalService.avatarList[vote.name];
                }
            }

            //Set command name
            this.commandName = null;
            this.buttonLabel = null;

            if (this.isCRMember && this.proposal.status == 'registered') {
                this.commandName = "reviewproposal";
                this.buttonLabel = "crproposalvoting.review-proposal";
            }

            this.addProposalDetails();
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposal-details'));
            this.titleBar.setMenuComponent(MileStoneOptionsComponent);
            Logger.log('CRProposal', "Proposal info:", this.proposal);
        }
        catch (err) {
            Logger.error('CRProposal', 'fetchProposalDetails error:', err);
        }

        this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposal-details'));
        this.proposalDetailFetched = true;
    }

    async setLastTracking(i: number) {
        let milestone = this.proposal.milestone[i];
        let budget = this.proposal.budgets[i];

        if (this.isOwner) {
            if (budget.status == 'Withdrawable') {
                milestone.lastTracking = {command: 'withdraw'};
            }
            else if (budget.status != "Withdrawn") {
                if (!milestone.tracking || milestone.tracking.length < 1) {
                    milestone.lastTracking = {command: 'apply'};
                }
                else {
                    milestone.lastTracking = milestone.tracking[0];

                    if (budget.status == 'Unfinished' && milestone.lastTracking.apply
                                && milestone.lastTracking.review && milestone.lastTracking.review.opinion == 'reject') {
                        milestone.lastTracking.command = 'apply';
                    }
                }
            }
        }
        else if (await this.voteService.isSecretaryGeneral() && milestone.tracking && milestone.tracking.length > 0 && budget.status == 'Unfinished') {
            let lastTracking = milestone.tracking[0];
            if (lastTracking.apply && lastTracking.apply.messageHash && (!lastTracking.review || !lastTracking.review.opinion)) {
                try {
                    let ret = await this.crOperations.getMessageData(lastTracking.apply.messageHash);
                    if (ret != null && ret.ownerSignature) {
                        lastTracking.command = 'review';
                        milestone.lastTracking = lastTracking;
                    }
                }
                catch (errMessage) {
                    Logger.error(App.CRSUGGESTION, 'Can not getMessageData on stage ', milestone.stage);
                }
            }
        }

        if (milestone.lastTracking) {
            milestone.lastTracking.stage = budget.stage;
        }
    }

    ionViewDidEnter() {
    }

    ionViewWillEnter() {
        if (!this.proposalDetailFetched) {
            void this.init();
        }
        this.commandReturnSub = this.crOperations.activeCommandReturn.subscribe(commandType => {
            if (commandType == CRCommandType.SuggestionDetailPage) {
                void this.init();
            }
        });

        this.changeDetector.detectChanges(); // Force angular to catch changes in complex objects
    }

    ionViewWillLeave() {
        this.commandReturnSub.unsubscribe();
        this.commandReturnSub = null;
    }

    ionViewDidLeave() {
        // this.titleBar.setTitle(this.translate.instant('proposals'));
    }

    async showOptions(ev: any, lastTracking: any) {
        Logger.log(App.CRPROPOSAL_VOTING, 'Opening options');

        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            component: MileStoneOptionsComponent,
            componentProps: {
                lastTracking: lastTracking,
            },
            cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'milestone-options-component' : 'milestone-options-component-dark',
            translucent: false,
            event: ev,
        });
        this.popover.onWillDismiss().then(() => {
            this.popover = null;
        });
        return await this.popover.present();
    }

    async doRefresh(event) {
        await this.init();

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }

    addProposalDetails() {
        this.proposalDetails = [];
        this.proposalDetails.push(
            {
                title: this.translate.instant('crproposalvoting.proposal'),
                type: 'innerHtml',
                value: this.proposal.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.type'),
                type: 'type',
                value: this.proposal.type,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'innerHtml',
                value: this.proposal.abstract ? marked(this.proposal.abstract) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.motivation'),
                type: 'innerHtml',
                value: this.proposal.motivation ? marked(this.proposal.motivation) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.goal'),
                type: 'innerHtml',
                value: this.proposal.goal ? marked(this.proposal.goal) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.milestone'),
                type: 'milestone',
                value: this.proposal.milestone,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.proposal-hash'),
                type: 'hash',
                value: this.proposal.proposalHash,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.implementation-team'),
                type: 'implementationTeam',
                value: this.proposal.implementationTeam,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.plan-statement'),
                type: 'innerHtml',
                value: this.proposal.planStatement ? marked(this.proposal.planStatement) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.budgets'),
                type: 'budgets',
                value: this.proposal.budgets,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.budget-statement'),
                type: 'innerHtml',
                value: this.proposal.budgetStatement ? marked(this.proposal.budgetStatement) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.url'),
                type: 'original-url',
                value: this.proposal.originalURL,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.receive-address'),
                type: 'receive-address',
                value: this.proposal.recipient,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.reservecustomizedid'),
                type: 'array',
                value: this.uxService.getArrayString(this.proposal.reservedCustomizedIDList),
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.member-votes'),
                type: 'member-votes',
                value: this.proposal.crVotes && this.proposal.crVotes.length > 0 ? this.proposal.crVotes : null,
                active: true
            }
        );
    }

    getVotesByType(type: VoteResultType) {
        return this.proposal.crVotes.filter((vote) => {
            return vote.result == type;
        })
    }

    getTimeLeft(duration: number): string {
        Logger.log(App.CRPROPOSAL_VOTING, 'Proposal time left', duration);
        if (duration < 3600) {
            let minutes = Math.round(duration / 60);
            return String(minutes) + ' minutes remaining';
        }
        else if (duration < 86400) {
            let hours = Math.round(duration / 3600);
            if (hours === 1) {
                return String(hours) + ' hour remaining';
            } else {
                return String(hours) + ' hours remaining';
            }
        }
        else {
            let days = Math.round(duration / 86400);
            if (days === 1) {
                return String(days) + ' day remaining';
            } else {
                return String(days) + ' days remaining';
            }
        }
    }

    handleCommand() {
        void this.crOperations.handleProposalDetailPageCommand(this.commandName);
    }
}
