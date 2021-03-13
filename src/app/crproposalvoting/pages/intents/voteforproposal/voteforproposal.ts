import { Component, NgZone, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ProposalService } from '../../../services/proposal.service';
import { UXService } from '../../../services/ux.service';
import { ActivatedRoute } from '@angular/router';
import { CROperationsService, VoteForProposalCommand } from '../../../services/croperations.service';
import { PopupService } from '../../../services/popup.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: 'page-voteforproposal',
  templateUrl: 'voteforproposal.html',
  styleUrls: ['./voteforproposal.scss']
})
export class VoteForProposalPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private originalRequestJWT: string;
  private voteForProposalCommand: VoteForProposalCommand;
  public sendingResponse = false;

  constructor(
    public navCtrl: NavController,
    private proposalService: ProposalService,
    private crOperations: CROperationsService,
    private route: ActivatedRoute,
    private zone: NgZone,
    public translate: TranslateService
  ) {
    this.route.queryParams.subscribe(async (data: {jwt: string, suggestionID: string})=>{
      this.zone.run(async ()=>{
        this.originalRequestJWT = data.jwt;
      });
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('vote-proposal'));
  }

  ionViewWillLeave() {
  }

  async ionViewDidEnter() {
    // Update system status bar every time we re-enter this screen.
    this.titleBar.setTitle("Vote against a proposal");

    this.voteForProposalCommand = this.crOperations.getOnGoingVoteForProposalCommand();
  }

  async voteAgainstProposal() {
    this.sendingResponse = true;

    // Request the wallet to publish our vote.
    try {
      let ret = await essentialsIntent.sendIntent("crproposalvoteagainst", {
        proposalHash: this.voteForProposalCommand.data.proposalHash
      });
      console.log("Vote for proposal intent has returned", ret);
      this.exitIntentWithSuccess();
    }
    catch (err) {
      console.error(err);
    }
  }

  private async exitIntentWithSuccess() {
    await this.crOperations.sendIntentResponse();
  }

  private async exitIntentWithError() {
    await this.crOperations.sendIntentResponse();
  }
}