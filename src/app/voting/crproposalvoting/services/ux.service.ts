import { Injectable } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';

type CRCommand = {
    command: string; // Ex: "voteforproposal"
}

type VoteForProposalCommand = CRCommand & {
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
        private globalNative: GlobalNativeService,
        private clipboard: Clipboard,
        private globalIntentService: GlobalIntentService,
        public translate: TranslateService
    ) {}

    init() {
    }

    formatDate(timestamp) {
        return moment(timestamp * 1000).format('MMMM Do YYYY');
    }

    genericToast(msg: string) {
        this.globalNative.genericToast(msg);
    }

    copyAddress(address: string) {
        Logger.log(App.VOTING, "Copy address to clipboard", address);
        void this.clipboard.copy(address);
        this.globalNative.genericToast('common.copied-to-clipboard', 2000, "success");
    }

    openLink(url) {
        Logger.log(App.VOTING, "Opening external URL:", url);
        void this.globalIntentService.sendIntent('openurl', { url: url })
    }

    getArrayString(list: [string]): string {
        if (!list) {
            return null;
        }
        let str = list.join(", ");
        Logger.log(App.VOTING, "Array:", str);
        return str;
    }
}
