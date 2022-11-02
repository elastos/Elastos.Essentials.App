import { Injectable } from '@angular/core';
import { App } from "src/app/model/app.enum";
import { VoteService } from 'src/app/voting/services/vote.service';
@Injectable({
    providedIn: 'root'
})
export class StakingInitService {
    constructor(
        public voteService: VoteService,
    ) { }

    public async init(): Promise<void> {
    }

    public async start() {
        await this.voteService.selectWalletAndNavTo(App.STAKING, '/staking/staking-home');
    }

    public async startStake() {
        await this.voteService.selectWalletAndNavTo(App.STAKING, '/staking/stake');
    }
}
