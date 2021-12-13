import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SuggestionSearchResult, SuggestionStatus } from '../../model/suggestion-model';
import { CROperationsService } from '../../services/croperations.service';
import { SuggestionService } from '../../services/suggestion.service';
import { UXService } from '../../services/ux.service';

@Component({
    selector: 'page-suggestion-list',
    templateUrl: 'suggestion-list.html',
    styleUrls: ['./suggestion-list.scss']
})
export class SuggestionListPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
    @ViewChild('content', { static: false }) content: IonContent;
    @ViewChild('search', { static: false }) search: IonInput;

    public suggestionStatus: SuggestionStatus;
    public suggestions: SuggestionSearchResult[] = [];
    public suggestionsFetched = false;

    public showSearch = false;
    public searchInput = '';

    public allSuggestionsLoaded = false;

    private fetchPage = 1;
    private searchPage = 1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public uxService: UXService,
        public theme: GlobalThemeService,
        private suggestionService: SuggestionService,
        private route: ActivatedRoute,
        private globalNav: GlobalNavService,
        public translate: TranslateService,
        private crOperations: CROperationsService,
    ) {
        this.suggestionStatus = this.route.snapshot.params.suggestionType as SuggestionStatus;
        Logger.log('CRSuggestion', 'Suggestion status:', this.suggestionStatus);
        this.allSuggestionsLoaded = false;
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        void this.init();
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async init() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-cr-suggestion'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "scan", iconPath: BuiltInIcon.SCAN });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if (icon.key == "scan") {
                void this.crOperations.handleScanAction();
            }
        });
        this.suggestionsFetched = false;
        this.suggestionService.reset();
        await this.fetchSuggestions();
    }

    async fetchSuggestions() {
        try {
            this.suggestions = await this.suggestionService.fetchSuggestions(this.suggestionStatus, 1);
            this.suggestionsFetched = true;
            this.showSearch = true;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.suggestions'));
        }
        catch (err) {
            Logger.error('crsuggestion', 'fetchSuggestions error:', err)
        }
    }

    async searchSuggestion(event) {
        Logger.log('crsuggestion', 'Search input changed', event);
        if (this.searchInput) {
            this.suggestionsFetched = false;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.searching-suggestions'));
            try {
                this.suggestions = await this.suggestionService.fetchSearchedSuggestion(this.searchPage, this.suggestionStatus, this.searchInput);
                this.suggestionsFetched = true;
                this.titleBar.setTitle(this.translate.instant('crproposalvoting.suggestions'));
            }
            catch (err) {
                Logger.error('crsuggestion', 'searchSuggestion error:', err);
            }
        } else {
            // Reset Search Page #
            this.searchPage = 1;
            await this.fetchSuggestions();
        }
    }

    async doRefresh(event) {
        this.searchInput = '';
        await this.fetchSuggestions();

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }

    public async loadMoreSuggestions(event) {
        if (!this.allSuggestionsLoaded) {
            Logger.log('crsuggestion', 'Loading more suggestions', this.fetchPage);
            void this.content.scrollToBottom(300);

            let suggestionsLength = this.suggestions.length;

            try {
                if (this.searchInput) {
                    this.searchPage++;
                    this.suggestions = await this.suggestionService.fetchSearchedSuggestion(this.searchPage, this.suggestionStatus, this.searchInput);
                } else {
                    this.fetchPage++;
                    this.suggestions = await this.suggestionService.fetchSuggestions(this.suggestionStatus, this.fetchPage);
                }
            }
            catch (err) {
                Logger.error('crsuggestion', 'loadMoreSuggestions error:', err);
            }

            if (this.suggestions.length === suggestionsLength) {
                if (this.searchInput) {
                    this.searchPage--;
                } else {
                    this.fetchPage--;
                }
                this.allSuggestionsLoaded = true;
                void this.uxService.genericToast(this.translate.instant('crproposalvoting.all-suggestions-are-loaded'));
                // this.content.scrollToTop(300);
            }
        }

        event.target.complete();
    }

    selectSuggestion(suggestion: SuggestionSearchResult) {
        // suggestion = this.suggestionService.getFetchedSuggestionById(754);
        Logger.log('crsuggestion', 'selectSuggestion:', suggestion);
        this.suggestionService.selectedSuggestion = suggestion;
        void this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/suggestion-detail", { state: { suggestionId: suggestion.sid } });
    }
}
