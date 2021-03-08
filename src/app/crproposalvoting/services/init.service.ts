import { Injectable } from '@angular/core';
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
    private crOperations: CROperationsService
  ) {}

  public async init(): Promise<void> {
    this.uxService.init();
    this.crOperations.init();
    this.appService.getTimeCheckedForProposals();
  }
}
