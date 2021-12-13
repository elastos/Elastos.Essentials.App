import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import marked from 'marked';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { SuggestionDetail, SuggestionSearchResult } from '../../model/suggestion-model';
import { CRCommandType, CROperationsService, CRWebsiteCommand } from '../../services/croperations.service';
// import { DraftService } from '../../services/draft.service';
import { SuggestionService } from '../../services/suggestion.service';
import { UXService } from '../../services/ux.service';

type MergedSuggestionInfo = SuggestionSearchResult & SuggestionDetail;

@Component({
    selector: 'page-suggestion-detail',
    templateUrl: 'suggestion-detail.html',
    styleUrls: ['./suggestion-detail.scss']
})
export class SuggestionDetailPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    suggestion: MergedSuggestionInfo;
    suggestionDetails = [];

    timeActive = false;
    rejectActive = false;

    activeTab = 1;
    totalBudget = 0;
    isCRMember = false;
    isSelf = false;
    commandName: string;
    buttonLabel: string;

    private commandReturnSub: Subscription = null;

    constructor(
        public uxService: UXService,
        private router: Router,
        public suggestionService: SuggestionService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private translate: TranslateService,
        public voteService: VoteService,
        private crOperations: CROperationsService,
        // private draftService: DraftService
    ) {

    }

    async init() {
        this.suggestion = null;
        try {
            this.isCRMember = await this.voteService.isCRMember();
            let suggestionSearchResult = this.suggestionService.selectedSuggestion;
            const suggestionId = suggestionSearchResult.sid;
            let suggestionDetails = await this.suggestionService.fetchSuggestionDetail(suggestionId);

            this.suggestion = Object.assign(suggestionSearchResult, suggestionDetails);
            this.isSelf = Util.isSelfDid(this.suggestion.did);

            //Get total budget
            if (this.suggestion.budgets) {
                for (let budget of this.suggestion.budgets) {
                    budget.type = budget.type.toLowerCase();
                    this.totalBudget += parseInt(budget.amount);
                }
            }

            //Set command name
            if (this.isCRMember && this.suggestion.status == 'signed') {
                this.commandName = "createproposal";
                this.buttonLabel = "crproposalvoting.make-into-proposal";
            }
            else if (this.isSelf && this.suggestion.status == 'unsigned'){
                this.commandName = "createsuggestion";
                this.buttonLabel = "crproposalvoting.sign-suggestion";
            }
            else {
                this.commandName = null;
                this.buttonLabel = null;
            }

            this.addSuggestionDetail();
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.suggestion-details'));
            Logger.log('CRSuggestion', "Merged suggestion info:", this.suggestion)
        }
        catch (err) {
            Logger.error('CRSuggestion', 'fetchSuggestionDetail error:', err);
        }
    }

    ionViewDidEnter() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.loading-suggestion'));

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
        // this.titleBar.setTitle(this.translate.instant('suggestions'));
    }

    addSuggestionDetail() {
        this.suggestionDetails = [];
        this.suggestionDetails.push(
            {
                title: this.translate.instant('crproposalvoting.suggestion'),
                type: 'marked',
                value: this.suggestion.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'marked',
                value: marked(this.suggestion.abstract),
                active: false
            },
            {
                title: this.translate.instant('crproposalvoting.motivation'),
                type: 'marked',
                value: marked(this.suggestion.motivation),
                active: false
            },
            {
                title: this.translate.instant('crproposalvoting.goal'),
                type: 'marked',
                value: marked(this.suggestion.goal),
                active: false
            },
            {
                title: this.translate.instant('crproposalvoting.milestone'),
                type: 'milestone',
                value: this.suggestion.milestone,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.implementation-team'),
                type: 'implementationTeam',
                value: this.suggestion.implementationTeam,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.plan-statement'),
                type: 'marked',
                value: this.suggestion.planStatement ? marked(this.suggestion.planStatement) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.budgets'),
                type: 'budgets',
                value: this.suggestion.budgets,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.budget-statement'),
                type: 'marked',
                value: this.suggestion.budgetStatement ? marked(this.suggestion.budgetStatement) : null,
                active: true
            }
        );
    }

    getTimeLeft(duration: number): string {
        Logger.log('crsuggestion', 'Suggestion time left', duration);
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

    openLink(item) {
        Logger.log('crsuggestion', "URL item clicked:", item);

        if (item.type === 'url') {
            const urlToOpen = item.value;
            Logger.log('crsuggestion', "Opening external URL:", urlToOpen);
            void this.globalIntentService.sendIntent('openurl', { url: urlToOpen })
        }
    }



    handleCommand() {
        let crcommand = { command: this.commandName, data: this.suggestion, sid: this.suggestion.sid, type: CRCommandType.SuggestionDetailPage } as CRWebsiteCommand;
        Logger.log('CRSuggestion', "Command:", crcommand);
        void this.crOperations.handleCRProposalCommand(crcommand, null);
    }
}
