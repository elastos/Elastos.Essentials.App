import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { CandidatesService } from './candidates.service';

@Injectable({
  providedIn: 'root'
})
export class CRCouncilVotingInitService {
  constructor(
    private candidatesService: CandidatesService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        this.candidatesService.init();
      }
    });
  }
}
