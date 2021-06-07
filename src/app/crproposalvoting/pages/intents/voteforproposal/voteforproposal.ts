import { Component, NgZone, ViewChild } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { ActivatedRoute } from '@angular/router';
import { CROperationsService, VoteForProposalCommand } from '../../../services/croperations.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';


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
    private crOperations: CROperationsService,
    private route: ActivatedRoute,
    private zone: NgZone,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
  ) {
    this.route.queryParams.subscribe(async (data: {jwt: string, suggestionID: string})=>{
      this.zone.run(async ()=>{
        this.originalRequestJWT = data.jwt;
      });
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('crproposalvoting.vote-proposal'));
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
        let ret = await this.globalIntentService.sendIntent("https://wallet.elastos.net/crproposalvoteagainst", {
        proposalHash: this.voteForProposalCommand.data.proposalHash
      });
      Logger.log('crproposal', "Vote for proposal intent has returned", ret);
      this.exitIntentWithSuccess();
    }
    catch (err) {
      Logger.error('crproposal', err);
    }
  }

  private async exitIntentWithSuccess() {
    await this.crOperations.sendIntentResponse();
  }

  private async exitIntentWithError() {
    await this.crOperations.sendIntentResponse();
  }
}