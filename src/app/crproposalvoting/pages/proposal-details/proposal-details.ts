import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ProposalService } from '../../services/proposal.service';
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { Router } from '@angular/router';
import { ProposalDetails, VoteResultType } from '../../model/proposal-details';
import { UXService } from '../../services/ux.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import marked from 'marked';

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

    constructor(
        public uxService: UXService,
        private router: Router,
        private proposalService: ProposalService,
        private changeDetector: ChangeDetectorRef,
        public theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private translate: TranslateService
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            const proposalId = navigation.extras.state.proposalId;
            Logger.log('CRProposal', 'Proposal details id', proposalId);
            this.init(proposalId);
        }
    }

    async init(proposalId) {
        this.proposal = null;
        try {
            let proposalSearchResult = this.proposalService.getFetchedProposalById(proposalId);
            let proposalDetails = await this.proposalService.fetchProposalDetails(proposalId);

            this.proposal = Object.assign(proposalSearchResult, proposalDetails);
            this.addProposalDetails();
            this.titleBar.setTitle(this.translate.instant('crproposalvoting.proposal-details'));
            Logger.log('CRProposal', "Merged proposal info:", this.proposal)
        }
        catch (err) {
            Logger.error('CRProposal', 'fetchProposalDetails error:', err);
        }
    }

    ionViewDidEnter() {
    }

    async ionViewWillEnter() {
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
                type: 'title',
                description: this.proposal.title,
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.abstract'),
                type: 'abstract',
                description: marked(this.proposal.abs),
                active: true
            },
            {
                title: this.translate.instant('crproposalvoting.proposal-hash'),
                type: 'hash',
                description: this.proposal.proposalHash,
                active: false
            },
            {
                title: this.translate.instant('crproposalvoting.url'),
                type: 'url',
                description: this.proposal.address,
                active: false
            }
        );
    }

    getVotesByType(type: VoteResultType) {
        return this.proposal.voteResult.filter((vote) => {
            return vote.value == type;
        })
    }

    getTimeLeft(duration: number): string {
        Logger.log('crproposal', 'Proposal time left', duration);
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
        Logger.log('crproposal', "URL item clicked:", item);

        if (item.type === 'url') {
            const urlToOpen = item.description;
            Logger.log('crproposal', "Opening external URL:", urlToOpen);
            this.globalIntentService.sendIntent('openurl', { url: urlToOpen })
        }
    }
}
