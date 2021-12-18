import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import marked from 'marked';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { ProposalDetails, VoteResultType } from '../../model/proposal-details';
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { CRCommandType, CROperationsService, CRWebsiteCommand } from '../../services/croperations.service';
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

    timeActive = false;
    rejectActive = false;

    activeTab = 1;
    totalBudget = 0;
    isCRMember = false;
    isSelf = false;

    commandName: string;
    buttonLabel: string;
    public Config = Config;
    public crvotes = {approve: 0, reject: 0, abstain: 0};
    public proposalHash: string;
    private commandReturnSub: Subscription = null;

    constructor(
        public uxService: UXService,
        private router: Router,
        private proposalService: ProposalService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        public voteService: VoteService,
        private crOperations: CROperationsService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            this.proposalHash = navigation.extras.state.proposalHash;
            Logger.log('CRProposal', 'Proposal details id', this.proposalHash);
        }
    }

    async init() {
        this.proposal = null;
        try {
            this.isCRMember = await this.voteService.isCRMember();
            this.proposal = await this.proposalService.fetchProposalDetails(this.proposalHash);
            Logger.log('CRProposal', "proposal", this.proposal);

            this.isSelf = Util.isSelfDid(this.proposal.did);

            //Get total budget
            if (this.proposal.budgets) {
                for (let budget of this.proposal.budgets) {
                    budget.type = budget.type.toLowerCase();
                    this.totalBudget += parseInt(budget.amount);
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
            Logger.log('CRProposal', "Merged proposal info:", this.proposal);
        }
        catch (err) {
            Logger.error('CRProposal', 'fetchProposalDetails error:', err);
        }
    }

    ionViewDidEnter() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.loading-proposal'));

        void this.init();
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

    addProposalDetails() {
        this.proposalDetails = [];
        this.proposalDetails.push(
            {
                title: this.translate.instant('crproposalvoting.proposal'),
                type: 'marked',
                value: this.proposal.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'marked',
                value: this.proposal.abstract ? marked(this.proposal.abstract) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.motivation'),
                type: 'marked',
                value: this.proposal.motivation ? marked(this.proposal.motivation) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.goal'),
                type: 'marked',
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
                type: 'marked',
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
                type: 'marked',
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
                title: this.translate.instant('crproposalvoting.member-votes'),
                type: 'member-votes',
                value: this.proposal.crVotes && this.proposal.crVotes.length > 0 ? this.proposal.crVotes : null,
                active: false
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
        let crcommand = { command: this.commandName, data: this.proposal, type: CRCommandType.ProposalDetailPage } as CRWebsiteCommand;
        Logger.log('CRSuggestion', "Command:", crcommand);
        void this.crOperations.handleCRProposalCommand(crcommand, null);
    }
}
