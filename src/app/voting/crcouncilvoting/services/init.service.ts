import { Injectable } from '@angular/core';
import { App } from 'src/app/model/app.enum';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CandidatesService } from './candidates.service';

@Injectable({
    providedIn: 'root'
})
export class CRCouncilVotingInitService {
    constructor(
        public voteService: VoteService,
        public candidatesService: CandidatesService,
    ) {
    }

    public init() {

    }

    public async startCouncil() {
        await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crmembers');
    }

    public async startCouncilElection() {
        await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
    }
}
