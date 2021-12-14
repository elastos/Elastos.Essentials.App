import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import marked from 'marked';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
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
    selector: 'page-proposal-details',
    templateUrl: 'proposal-details.html',
    styleUrls: ['./proposal-details.scss']
})
export class ProposalDetailsPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    proposal: MergedProposalInfo;
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

    constructor(
        public uxService: UXService,
        private router: Router,
        private proposalService: ProposalService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private translate: TranslateService,
        private clipboard: Clipboard,
        public voteService: VoteService,
        private crOperations: CROperationsService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            const proposalId = navigation.extras.state.proposalId;
            Logger.log('CRProposal', 'Proposal details id', proposalId);
            void this.init(proposalId);
        }
    }

    async init(proposalId) {
        this.proposal = null;
        try {
            this.isCRMember = await this.voteService.isCRMember();
            let proposalSearchResult = this.proposalService.getFetchedProposalById(proposalId);
            let proposalHash = proposalSearchResult.proposalHash;
            // let proposalHash = "f85dc0a06c2a03e3ca278f49fccf3e773b2599a6c64bdaffd5d9604e61f5b29c";
            let proposalDetails = await this.proposalService.fetchProposalDetails(proposalHash);
            Logger.log('CRProposal', "proposal", proposalSearchResult, proposalDetails);

            this.proposal = Object.assign(proposalSearchResult, proposalDetails);
            // this.isSelf = Util.isSelfDid(this.proposal.did);

            //Get total budget
            if (this.proposal.budgets) {
                for (let budget of this.proposal.budgets) {
                    budget.type = budget.type.toLowerCase();
                    this.totalBudget += parseInt(budget.amount);
                }
            }

            //Get cr votes
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
                }
            }

            //Set command name
            if (this.isCRMember && this.proposal.status == 'registered') {
                this.commandName = "reviewproposal";
                this.buttonLabel = "crproposalvoting.review-proposal";
            }
            // else if (this.isSelf && this.proposal.status == 'unsigned'){
            //     this.commandName = "createsuggestion";
            //     this.buttonLabel = "crproposalvoting.sign-suggestion";
            // }
            else {
                this.commandName = null;
                this.buttonLabel = null;
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
        this.changeDetector.detectChanges(); // Force angular to catch changes in complex objects
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

    openLink(url) {
        Logger.log(App.CRPROPOSAL_VOTING, "Opening external URL:", url);
        void this.globalIntentService.sendIntent('openurl', { url: url })
    }

    copyAddress(address: string) {
        Logger.log(App.CRPROPOSAL_VOTING, "Copy address to clipboard", address);
        void this.clipboard.copy(address);
    }

    handleCommand() {
        let crcommand = { command: this.commandName, data: this.proposal, type: CRCommandType.ProposalDetailPage } as CRWebsiteCommand;
        Logger.log('CRSuggestion', "Command:", crcommand);
        void this.crOperations.handleCRProposalCommand(crcommand, null);
    }
}
