import { Injectable } from '@angular/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { VoteService } from 'src/app/vote/services/vote.service';

@Injectable({
    providedIn: 'root'
})
export class DPoSVotingInitService {
    constructor(
        private globalNav: GlobalNavService,
        public voteService: VoteService,

    ) { }

    public async init(): Promise<void> {
    }

    public async start() {
        await this.voteService.selectWalletAndNavTo(App.DPOS_VOTING, '/dposvoting/menu/vote');
    }
}
