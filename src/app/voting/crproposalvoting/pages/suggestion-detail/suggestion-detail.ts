import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import marked from 'marked';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SuggestionDetail, SuggestionSearchResult } from '../../model/suggestion-model';
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

    constructor(
        public uxService: UXService,
        private router: Router,
        public suggestionService: SuggestionService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private translate: TranslateService
    ) {
        // const navigation = this.router.getCurrentNavigation();
        // if (navigation.extras.state) {
        //     // const suggestionId = navigation.extras.state.suggestionId;
            // const suggestionId = "6125a2da93999f007a050c29";
            // Logger.log('CRSuggestion', 'Suggestion details id', suggestionId);
            this.init();
        // }
    }

    async init() {
        this.suggestion = null;
        try {
            let suggestionSearchResult = this.suggestionService.selectedSuggestion;
            const suggestionId = "6125a2da93999f007a050c29";
            let suggestionDetails = await this.suggestionService.fetchSuggestionDetail(suggestionId);

            this.suggestion = Object.assign(suggestionSearchResult, suggestionDetails);
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

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.loading-suggestion'));
        this.changeDetector.detectChanges(); // Force angular to catch changes in complex objects
    }

    ionViewDidLeave() {
        // this.titleBar.setTitle(this.translate.instant('suggestions'));
    }

    addSuggestionDetail() {
        this.suggestionDetails = [];
        this.suggestionDetails.push(
            {
                title: this.translate.instant('crproposalvoting.suggestion'),
                type: 'title',
                description: this.suggestion.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'abstract',
                description: marked(this.suggestion.abs),
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.suggestion-id'),
                type: 'hash',
                description: this.suggestion.id,
                active: false
            },
            {
                title: this.translate.instant('crproposalvoting.url'),
                type: 'url',
                description: this.suggestion.address,
                active: false
            }
        );
    }

    // getVotesByType(type: VoteResultType) {
    //     return this.suggestion.voteResult.filter((vote) => {
    //         return vote.value == type;
    //     })
    // }

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
            const urlToOpen = item.description;
            Logger.log('crsuggestion', "Opening external URL:", urlToOpen);
            this.globalIntentService.sendIntent('openurl', { url: urlToOpen })
        }
    }
}
