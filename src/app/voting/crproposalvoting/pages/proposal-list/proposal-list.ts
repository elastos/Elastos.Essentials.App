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

    public allProposalsLoaded = false;

    private fetchPage = 1;
    private searchPage = 1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public uxService: UXService,
        public theme: GlobalThemeService,
        private proposalService: ProposalService,
        private route: ActivatedRoute,
        private globalNav: GlobalNavService,
        public translate: TranslateService
    ) {
        this.proposalType = this.route.snapshot.params.proposalType as ProposalStatus;
        Logger.log('CRProposal', this.proposalType, 'Proposal type');
        this.allProposalsLoaded = false;
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
        this.proposalsFetched = false;
        this.proposalService.reset();
        await this.fetchProposals();
    }

    async fetchProposals() {
        try {
            this.proposals = await this.proposalService.fetchProposals(this.proposalType, 1);
            this.proposalsFetched = true;
            this.showSearch = true;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposals'));
        }
        catch (err) {
            Logger.error('crproposal', 'fetchProposals error:', err)
        }
    }

    async searchProposal(event) {
        Logger.log(App.CRPROPOSAL_VOTING, 'Search input changed', event);
        if (this.searchInput) {
            this.proposalsFetched = false;
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.searching-proposals'));
            try {
                this.proposals = await this.proposalService.fetchSearchedProposal(this.searchPage, this.proposalType, this.searchInput);
                this.proposalsFetched = true;
                this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposals'));
            }
            catch (err) {
                Logger.error('crproposal', 'searchProposal error:', err);
            }
        } else {
            // Reset Search Page #
            this.searchPage = 1;
            await this.fetchProposals();
        }
    }

    async doRefresh(event) {
        this.searchInput = '';
        await this.fetchProposals();

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }

    public async loadMoreProposals(event) {
        if (!this.allProposalsLoaded) {
            Logger.log(App.CRPROPOSAL_VOTING, 'Loading more proposals', this.fetchPage);
            void this.content.scrollToBottom(300);

            let proposalsLength = this.proposals.length;

            try {
                if (this.searchInput) {
                    this.searchPage++;
                    this.proposals = await this.proposalService.fetchSearchedProposal(this.searchPage, this.proposalType, this.searchInput);
                } else {
                    this.fetchPage++;
                    this.proposals = await this.proposalService.fetchProposals(this.proposalType, this.fetchPage);
                }
            }
            catch (err) {
                Logger.error('crproposal', 'loadMoreProposals error:', err);
            }

            if (this.proposals.length === proposalsLength) {
                if (this.searchInput) {
                    this.searchPage--;
                } else {
                    this.fetchPage--;
                }
                this.allProposalsLoaded = true;
                void this.uxService.genericToast(this.translate.instant('crproposalvoting.all-proposals-are-loaded'));
                // this.content.scrollToTop(300);
            }
        }

        event.target.complete();
    }

    selectProposal(proposal: ProposalSearchResult) {
        this.proposalService.navigateToProposalDetailPage(proposal);
    }
}
