import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { GlobalNativeService } from 'src/app/services/global.native.service';



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

    genericToast(msg: string) {
        this.native.genericToast(msg);
    }
}
