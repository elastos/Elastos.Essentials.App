import { Injectable } from '@angular/core';
import { CandidatesService } from './candidates.service';

@Injectable({
  providedIn: 'root'
})
export class CRCouncilVotingInitService {
  constructor(
    private candidatesService: CandidatesService,
  ) {}

  public async init(): Promise<void> {
    this.candidatesService.init();
  }
}
