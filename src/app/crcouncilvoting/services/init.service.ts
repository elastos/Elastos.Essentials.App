import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService } from 'src/app/services/global.service.manager';
import { CandidatesService } from './candidates.service';

@Injectable({
  providedIn: 'root'
})
export class CRCouncilVotingInitService extends GlobalService {
  constructor(
    private candidatesService: CandidatesService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {

  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    void this.candidatesService.init();
    return;
  }

  public onUserSignOut(): Promise<void> {
    this.candidatesService.stop();
    return;
  }
}
