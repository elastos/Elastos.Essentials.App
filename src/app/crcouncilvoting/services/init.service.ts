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

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    this.candidatesService.init();
  }

  public async onUserSignOut(): Promise<void> {
    this.candidatesService.stop();
  }
}
