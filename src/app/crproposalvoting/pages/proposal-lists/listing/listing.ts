import { Component, ViewChild, NgZone, OnInit } from '@angular/core';
import { NavController, IonContent, IonInput } from '@ionic/angular';
import { ProposalService } from '../../../services/proposal.service';
import { ProposalsSearchResponse } from '../../../model/proposal-search-response';
import { ProposalSearchResult } from '../../../model/proposal-search-result';
import { ProposalStatus } from '../../../model/proposal-status';
import { UXService } from '../../../services/ux.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
  selector: 'page-proposal-listing',
  templateUrl: 'listing.html',
  styleUrls: ['./listing.scss']
})
export class ProposalListingPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('content', {static: false}) content: IonContent;
  @ViewChild('search', {static: false}) search: IonInput;

  public proposalType: ProposalStatus;
  public proposals: ProposalSearchResult[] = [];
  public proposalsFetched = false;

  public showSearch = false;
  public searchInput = '';
  private proposalsSearchResponse: ProposalsSearchResponse;

  public allProposalsLoaded = false;

  private fetchPage = 1;
  private searchPage = 1;

  constructor(
    public navCtrl: NavController,
    public uxService: UXService,
    public theme: GlobalThemeService,
    private proposalService: ProposalService,
    private route: ActivatedRoute,
    private zone: NgZone,
  ) {
    this.proposalType = this.route.snapshot.params.proposalType as ProposalStatus;

    console.log(this.proposalType, 'Proposal type');
    this.allProposalsLoaded = false;
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.allProposalsLoaded = false;
  }

  async ionViewDidEnter() {
    if (!this.proposalsFetched) {
      this.fetchProposals();
    }

    if(this.proposals.length > 0) {
      this.titleBar.setTitle("Proposals");
    }
  }

  ionViewWillLeave() {
  }

  async fetchProposals() {
    this.proposalsSearchResponse = await this.proposalService.fetchProposals(this.proposalType, 1);
    this.proposals = this.proposalsSearchResponse.data.list;
    this.proposalsFetched = true;
    this.showSearch = true;
    this.titleBar.setTitle("Proposals");
  }

  async searchProposal(event) {
    console.log('Search input changed', event);
    if(this.searchInput) {
      this.proposalsFetched = false;
      this.titleBar.setTitle("Searching Proposal..");
      this.proposalsSearchResponse = await this.proposalService.fetchSearchedProposal(this.searchPage, this.proposalType, this.searchInput);
      this.proposals = this.proposalsSearchResponse.data.list;
      this.proposalsFetched = true;
      this.titleBar.setTitle("Proposals");
    } else {
      // Reset Search Page #
      this.searchPage = 1;
      this.fetchProposals();
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
    if(!this.allProposalsLoaded) {
      console.log('Loading more proposals', this.fetchPage);
      this.content.scrollToBottom(300);

      if(this.searchInput) {
        this.searchPage++;
        this.proposalsSearchResponse = await this.proposalService.fetchSearchedProposal(this.searchPage, this.proposalType, this.searchInput);
      } else {
        this.fetchPage++;
        this.proposalsSearchResponse = await this.proposalService.fetchProposals(this.proposalType, this.fetchPage);
      }

      let proposalsLength = this.proposals.length;
      this.proposals = this.proposals.concat(this.proposalsSearchResponse.data.list);

      if(this.proposals.length === proposalsLength) {
        this.allProposalsLoaded = true;
        this.uxService.genericToast('All proposals are loaded');
        // this.content.scrollToTop(300);
      }
    }

    event.target.complete();
  }

  selectProposal(proposal: ProposalSearchResult) {
    this.proposalService.navigateToProposalDetailsPage(proposal);
  }
}
