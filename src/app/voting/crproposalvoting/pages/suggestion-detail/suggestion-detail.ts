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
import { Config } from 'src/app/wallet/config/Config';
import { SuggestionDetail, SuggestionSearchResult } from '../../model/suggestion-model';
import { CRCommandType, CROperationsService } from '../../services/croperations.service';
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

    suggestion: SuggestionDetail;
    suggestionDetails = [];
    suggestionDetailFetched = false;

    timeActive = false;
    rejectActive = false;

    activeTab = 1;
    totalBudget = 0;
    isCRMember = false;
    isSelf = false;
    commandName: string;
    buttonLabel: string;
    public Config = Config;

    private commandReturnSub: Subscription = null;
    public suggestionId: string;
    public proposaltype: string;

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
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            this.suggestionId = navigation.extras.state.suggestionId;
            Logger.log('CRSuggestion', 'Suggestion id', this.suggestionId);
        }
    }

    async init() {
        this.suggestion = null;
        this.suggestionDetailFetched = false;
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.loading-suggestion'));

        try {
            this.isCRMember = await this.voteService.isCRMember();
            this.suggestion = await this.suggestionService.fetchSuggestionDetail(this.suggestionId);
            this.isSelf = Util.isSelfDid(this.suggestion.did);

            //Get total budget
            this.totalBudget = 0;
            if (this.suggestion.budgets) {
                for (let budget of this.suggestion.budgets) {
                    budget.type = budget.type.toLowerCase();
                    this.totalBudget += parseInt(budget.amount);
                }
            }

            //Set command name
            this.commandName = null;
            this.buttonLabel = null;

            this.proposaltype = this.suggestionService.getProposalTypeForChangeProposal(this.suggestion);
            let selfPublicKey = await this.crOperations.getSelfPublicKey();
            this.suggestionService.adjustSuggectionStatus(this.suggestion, selfPublicKey);

            if (this.isCRMember && this.suggestion.status == 'signed'
                    && !(this.suggestion.type == "secretarygeneral" && !this.suggestion.newSecretarySignature)
                    && !(this.suggestion.type == "changeproposalowner" && !this.suggestion.newOwnerSignature)) {
                this.commandName = "createproposal";
                this.buttonLabel = "crproposalvoting.make-into-proposal";
            }
            else if (this.suggestion.status == 'unsigned' && (this.isSelf
                    || (this.suggestion.type == "secretarygeneral" && Util.isSelfDid(this.suggestion.newSecretaryDID && this.suggestion.signature))
                    || (this.suggestion.type == "changeproposalowner" && selfPublicKey == this.suggestion.newOwnerPublicKey && this.suggestion.signature))) {
                this.commandName = "createsuggestion";
                this.buttonLabel = "crproposalvoting.sign-suggestion";
            }

            this.addSuggestionDetail();
            Logger.log('CRSuggestion', "Merged suggestion info:", this.suggestion)
        }
        catch (err) {
            Logger.error('CRSuggestion', 'fetchSuggestionDetail error:', err);
        }

        this.titleBar.setTitle(this.translate.instant('crproposalvoting.suggestion-details'));
        this.suggestionDetailFetched = true;
    }

    ionViewDidEnter() {
    }

    ionViewWillEnter() {
        if (!this.suggestionDetailFetched) {
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
        // this.titleBar.setTitle(this.translate.instant('suggestions'));
    }

    addSuggestionDetail() {
        this.suggestionDetails = [];
        this.suggestionDetails.push(
            {
                title: this.translate.instant('crproposalvoting.suggestion'),
                type: 'innerHtml',
                value: this.suggestion.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.type'),
                type: 'type',
                value: this.proposaltype,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'innerHtml',
                value: this.suggestion.abstract ? marked(this.suggestion.abstract) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.motivation'),
                type: 'innerHtml',
                value: this.suggestion.motivation ? marked(this.suggestion.motivation) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.goal'),
                type: 'innerHtml',
                value: this.suggestion.goal ? marked(this.suggestion.goal) : null,
                active: true
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
                type: 'innerHtml',
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
                type: 'innerHtml',
                value: this.suggestion.budgetStatement ? marked(this.suggestion.budgetStatement) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.receive-address'),
                type: 'receive-address',
                value: this.suggestion.recipient,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.reservecustomizedid'),
                type: 'array',
                value: this.uxService.getArrayString(this.suggestion.reservedCustomizedIDList),
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.receivedcustomizedid'),
                type: 'array',
                value: this.uxService.getArrayString(this.suggestion.receivedCustomizedIDList),
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.receiver-did'),
                type: 'receive-address',
                value: this.suggestion.receiverDID,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.new-recipient-address'),
                type: 'innerHtml',
                value: this.suggestion.newRecipient,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.new-secretarygeneraldid'),
                type: 'innerHtml',
                value: this.suggestion.newSecretaryDID,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.rate-of-customized-id-fee'),
                type: 'number',
                value: this.suggestion.rateOfCustomizedIDFee,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.eid-effective-height'),
                type: 'number',
                value: this.suggestion.EIDEffectiveHeight,
                active: true
            },
            //SideChain Info
            {
                title: this.translate.instant('crproposalvoting.side-chain-name'),
                type: 'innerHtml',
                value: this.suggestion.sideChainName,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.magic-number'),
                type: 'number',
                value: this.suggestion.magicNumber,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.genesis-hash'),
                type: 'hash',
                value: this.suggestion.genesisHash,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.exchange-rate'),
                type: 'number',
                value: this.suggestion.exchangeRate,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.effective-height'),
                type: 'innerHtml',
                value: this.suggestion.effectiveHeight,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.resource-path'),
                type: 'innerHtml',
                value: this.suggestion.resourcePath,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.other-info'),
                type: 'innerHtml',
                value: this.suggestion.otherInfo ? marked(this.suggestion.otherInfo) : null,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.url'),
                type: 'original-url',
                value: this.suggestion.originalURL,
                active: true
            },
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

    handleCommand() {
        void this.crOperations.handleSuggestionDetailPageCommand(this.commandName, this.suggestionId, this.suggestion);
    }
}
