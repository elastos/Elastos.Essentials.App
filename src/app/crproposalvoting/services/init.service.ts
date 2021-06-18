import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AppService } from './app.service';
import { CROperationsService } from './croperations.service';
import { ProposalService } from './proposal.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class CRProposalVotingInitService extends GlobalService {
  constructor(
    private appService: AppService,
    private uxService: UXService,
    private crOperations: CROperationsService,
    private proposalService: ProposalService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    this.uxService.init();
    this.crOperations.init();
    this.proposalService.init();
    this.appService.getTimeCheckedForProposals();
  }

  public async onUserSignOut(): Promise<void> {
    this.crOperations.stop();
    this.proposalService.stop();
    // TODO something else need to stop?
  }
}
