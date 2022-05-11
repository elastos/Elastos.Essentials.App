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
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { ProposalStatus } from '../../model/proposal-status';
import { ProposalService } from '../../services/proposal.service';
import { UXService } from '../../services/ux.service';

@Component({
    selector: 'page-proposal-list',
    templateUrl: 'proposal-list.html',
    styleUrls: ['./proposal-list.scss']
})
export class ProposalListPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
    @ViewChild('content', { static: false }) content: IonContent;
    @ViewChild('search', { static: false }) search: IonInput;

    public proposalType: ProposalStatus;
    public proposals: ProposalSearchResult[] = [];
    public proposalsFetched = false;

    public showSearch = false;
    public searchInput = '';

    private fetchPage = 1;
    private searchPage = 1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public uxService: UXService,
        public theme: GlobalThemeService,
        private proposalService: ProposalService,
        private route: ActivatedRoute,
        private globalNav: GlobalNavService,
        public translate: TranslateService,
    ) {
        this.proposalType = this.route.snapshot.params.proposalType as ProposalStatus;
        Logger.log('CRProposal', this.proposalType, 'Proposal type');
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
        this.titleBar.setTitle(this.translate.instant('launcher.app-cr-proposal'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "scan", iconPath: BuiltInIcon.SCAN });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            void this.globalNav.navigateTo("scanner", '/scanner/scan');
        });

        //Don't refreash the list.
        if (this.proposalsFetched) {
            return;
        }

        this.proposalService.reset();
        await this.fetchProposals();
    }

    async fetchProposals(results = 10) {
        try {
            this.proposals = await this.proposalService.fetchProposals(this.proposalType, 1, results);
            this.proposalsFetched = true;
            this.showSearch = true;
            this.fetchPage = Math.floor(this.proposals.length / 10) + 1;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposals'));
            Logger.log(App.CRPROPOSAL_VOTING, 'fetchProposals', this.proposals);
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposals error:', err)
        }
    }

    async searchProposal(event) {
        Logger.log(App.CRPROPOSAL_VOTING, 'Search input changed', event);
        // Reset Search Page #
        this.searchPage = 1;
        if (this.searchInput) {
            this.proposalsFetched = false;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.searching-proposals'));
            try {
                this.proposals = await this.proposalService.fetchSearchedProposal(1, this.proposalType, this.searchInput);
                this.proposalsFetched = true;
                this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposals'));
                this.searchPage = 2;
            }
            catch (err) {
                Logger.error(App.CRPROPOSAL_VOTING, 'searchProposal error:', err);
            }
        } else {
            this.proposals = this.proposalService.allResults;
        }
    }

    async doRefresh(event) {
        this.searchInput = '';
        this.proposalService.reset();
        await this.fetchProposals(this.proposalService.allResults.length);

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }

    public async loadMoreProposals(event) {
        Logger.log(App.CRPROPOSAL_VOTING, 'Loading more proposals', this.fetchPage);
        let proposalsLength = this.proposals.length;

        try {
            if (this.searchInput) {
                this.proposals = await this.proposalService.fetchSearchedProposal(this.searchPage, this.proposalType, this.searchInput);
            }
            else {
                this.proposals = await this.proposalService.fetchProposals(this.proposalType, this.fetchPage);
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'loadMoreProposals error:', err);
        }

        if (this.proposals.length === proposalsLength) {
            void this.uxService.genericToast(this.translate.instant('crproposalvoting.all-proposals-are-loaded'));
        }
        else {
            if (this.searchInput) {
                this.searchPage++;
            } else {
                this.fetchPage++;
            }
            void this.content.scrollToBottom(300);
        }

        event.target.complete();
    }

    selectProposal(proposal: ProposalSearchResult) {
        this.proposalService.navigateToProposalDetailPage(proposal);
    }
}
