import { Injectable } from '@angular/core';
import { ProposalStatus } from '../model/proposal-status';
import { GlobalNativeService } from 'src/app/services/global.native.service';

import * as moment from 'moment';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;
declare let didManager: DIDPlugin.DIDManager;

type CRWebsiteCommand = {
    command: string; // Ex: "voteforproposal"
}

type VoteForProposalCommand = CRWebsiteCommand & {
    data: {
        proposalHash: string;
    }
}

@Injectable({
    providedIn: 'root'
})
export class UXService {
    public static instance: UXService = null;
    private isReceiveIntentReady = false;
    private appIsLaunchingFromIntent = false; // Is the app starting because of an intent request?

    constructor(
        private native: GlobalNativeService
    ) {}

    async init() {
        console.log("UXService is initializing");
    }

    formatDate(timestamp) {
        return moment(timestamp * 1000).format('MMMM Do YYYY');
    }

    getDisplayableStatus(status: ProposalStatus) {
        switch (status) {
          case 'VOTING':
              return 'Under Council Review';
          case 'NOTIFICATION':
              return 'Under Community Review';
          case 'ACTIVE':
              return 'Active';
          case 'FINAL':
              return 'Approved';
          case 'REJECTED':
              return 'Rejected';
        }
    }

    async genericToast(msg: string) {
        this.native.genericToast(msg);
    }
}
