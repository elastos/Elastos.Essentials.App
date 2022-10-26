import { Injectable } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Injectable({
    providedIn: 'root'
})
export class UXService {
    public static instance: UXService = null;

    constructor(
        private globalNative: GlobalNativeService,
        private clipboard: Clipboard,
        private globalIntentService: GlobalIntentService,
        public translate: TranslateService
    ) { }

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
        this.globalNative.genericToast('common.copied-to-clipboard', 2000);
    }

    openLink(url: string) {
        Logger.log(App.VOTING, "Opening external URL:", url);

        url = url.trim();
        if (url.indexOf("://") == -1) {
            url = "http://" + url;
        }
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

    stringArrayToNumberArray(stringArray: [string]): number[] {
        var numberArray = [] ;
        for(let i in stringArray) {
            numberArray.push(Number.parseInt(stringArray[i]));
        }
        return numberArray;
    }

    getStakeDate(days: number): string {
        var stakeTimestamp = new Date().getTime() / 1000 + days * 24 * 60 * 60;
        return this.formatDate(stakeTimestamp);
    }

    checkWalletAddress(address: string) {
        if (address.match("^[A-Za-z0-9]+$") && address.length == 34
            && (address.startsWith("E") || address.startsWith("8"))) {
            return true;
        }
        return false;
    }

    checkStakeAddress(address: string) {
        if (address.match("^[A-Za-z0-9]+$") && address.length == 34
            && address.startsWith("S")) {
            return true;
        }
        return false;
    }
}
