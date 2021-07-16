import { Injectable } from '@angular/core';
import { App } from "src/app/model/app.enum"
import { VoteService } from 'src/app/vote/services/vote.service';

@Injectable({
  providedIn: 'root'
})
export class CRCouncilVotingInitService {
  constructor(
    public voteService: VoteService,
  ) {}

  public async init(): Promise<void> {
  }

  public async start() {
    await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
  }
}
