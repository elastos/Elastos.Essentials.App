import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { AppService } from './app.service';
import { CROperationsService } from './croperations.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class CRProposalVotingInitService {
  constructor(
    private appService: AppService,
    private uxService: UXService,
    private crOperations: CROperationsService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        this.uxService.init();
        this.crOperations.init();
        this.appService.getTimeCheckedForProposals();
      }
    });
  }
}
