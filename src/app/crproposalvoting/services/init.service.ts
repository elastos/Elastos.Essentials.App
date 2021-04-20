import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { AppService } from './app.service';
import { CROperationsService } from './croperations.service';
import { ProposalService } from './proposal.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class CRProposalVotingInitService {
  constructor(
    private appService: AppService,
    private uxService: UXService,
    private crOperations: CROperationsService,
    private proposalService: ProposalService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    // TODO if user don't start this app, we should not do these.
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        this.uxService.init();
        this.crOperations.init();
        this.proposalService.init();
        this.appService.getTimeCheckedForProposals();
      } else {
        this.crOperations.stop();
        this.proposalService.stop();
        // TODO something else need to stop?
      }
    });
  }
}
