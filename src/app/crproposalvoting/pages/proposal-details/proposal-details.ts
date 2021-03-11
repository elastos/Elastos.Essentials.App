import { Component, NgZone, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ProposalService } from '../../services/proposal.service';
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { ActivatedRoute } from '@angular/router';
import { ProposalDetails, VoteResultType } from '../../model/proposal-details';
import { UXService } from '../../services/ux.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

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
    public navCtrl: NavController,
    public uxService: UXService,
    private route: ActivatedRoute,
    private proposalService: ProposalService,
    private zone: NgZone,
    private changeDetector: ChangeDetectorRef,
    public theme: GlobalThemeService
  ) {
  }

  ionViewDidEnter() {
  }

  async ionViewWillEnter() {
    this.uxService.setTitleBarBackKeyShown(true);

    // Update system status bar every time we re-enter this screen.
    this.titleBar.setTitle('Loading Proposal...');

    this.changeDetector.detectChanges(); // Force angular to catch changes in complex objects

    this.route.queryParams.subscribe(async (data: {proposalId: number})=>{
      this.zone.run(async ()=>{
        this.proposal = null;

        let proposalSearchResult = this.proposalService.getFetchedProposalById(data.proposalId);
        let proposalDetails = await this.proposalService.fetchProposalDetails(data.proposalId);

        this.proposal = Object.assign(proposalSearchResult, proposalDetails);
        this.addProposalDetails();
        // titleBarManager.setTitle('Proposal ' + '#' + this.proposal.id);
        this.titleBar.setTitle('Proposal Details');
        console.log("Merged proposal info:", this.proposal)
      });
    });
  }

  ionViewDidLeave() {
    this.titleBar.setTitle('Proposals');
  }

  addProposalDetails() {
    this.proposalDetails = [];
    this.proposalDetails.push(
      {
        title: 'Proposal',
        type: 'title',
        description: this.proposal.title,
        active: true
      },
      {
        title: 'Abstract',
        type: 'abstract',
        description: this.proposal.abs,
        active: true
      },
      {
        title: 'Proposal Hash',
        type: 'hash',
        description: this.proposal.proposalHash,
        active: false
      },
      {
        title: 'Original URL',
        type: 'url',
        description: this.proposal.address,
        active: false
      }
    );
  }

  getVotesByType(type: VoteResultType) {
    return this.proposal.voteResult.filter((vote)=>{
      return vote.value == type;
    })
  }

  getTimeLeft(duration: number): string {
    console.log('Proposal time left', duration);
    if(duration < 3600) {
      let minutes = Math.round(duration / 60);
      return String(minutes) + ' minutes remaining';
    } else if(duration < 86400) {
      let hours = Math.round(duration / 3600);
      if(hours === 1) {
        return String(hours) + ' hour remaining';
      } else {
        return String(hours) + ' hours remaining';
      }
    } else {
      let days = Math.round(duration / 86400);
      if(days === 1) {
        return String(days) + ' day remaining';
      } else {
        return String(days) + ' days remaining';
      }
    }
  }

  openLink(item) {
    console.log("URL item clicked:", item);

    if(item.type === 'url') {
      const urlToOpen = item.description;
      console.log("Opening external URL:", urlToOpen);
      essentialsIntent.sendIntent('openurl', { url: urlToOpen })
    }
  }
}
