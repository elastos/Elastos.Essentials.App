import { Injectable } from '@angular/core';
import { ProposalStatus } from '../model/proposal-status';
import { GlobalNativeService } from 'src/app/services/global.native.service';

import * as moment from 'moment';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';


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
        private native: GlobalNativeService,
        public translate: TranslateService
    ) {}

    init() {
    }

    formatDate(timestamp) {
        return moment(timestamp * 1000).format('MMMM Do YYYY');
    }

    getDisplayableStatus(status: ProposalStatus) {
        switch (status) {
          case 'VOTING':
              return this.translate.instant('crproposalvoting.status-voting');
          case 'NOTIFICATION':
              return this.translate.instant('crproposalvoting.status-notification');
          case 'ACTIVE':
              return this.translate.instant('crproposalvoting.status-active');
          case 'FINAL':
              return this.translate.instant('crproposalvoting.status-final');
          case 'REJECTED':
              return this.translate.instant('crproposalvoting.status-rejected');
        }
    }

    async genericToast(msg: string) {
        this.native.genericToast(msg);
    }
}
