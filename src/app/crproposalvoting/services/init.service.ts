import { Injectable } from '@angular/core';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
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
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    runDelayed(() => {
      Logger.log("crproposal", "User signed in, initializing internal services");
      void this.uxService.init();
      void this.crOperations.init();
      void this.proposalService.init();
      void this.appService.getTimeCheckedForProposals();
    }, 7000); // 7 seconds before starting everything, to release the Essentials boot load.
    return;
  }

  public onUserSignOut(): Promise<void> {
    this.crOperations.stop();
    this.proposalService.stop();
    return;
  }
}
