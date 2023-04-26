import { Injectable } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
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

    stringArrayToNumberArray(stringArray: string[]): number[] {
        var numberArray = [] ;
        for(let i in stringArray) {
            numberArray.push(Number(stringArray[i]));
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

    getPercentage(numerator: number, denominator: number): number {
        var ret = 0;
        if (denominator > 0) {
            ret = Math.floor(numerator / denominator * 10000) / 100;
        }
        return ret;
    }

    toThousands(val, precision = 8): string {
        if (Util.isString(val)) {
            val = parseFloat(val);
        }

        if (!Util.isNumber(val)) {
            return "NaN";
        }

        if (precision == -1) {
            precision = 2;
            if (val < 1) {
                precision = 8;
            } else if (val < 100) {
                precision = 4;
            }
        }

        var fixedNumber = val.toFixed(precision);
        while (fixedNumber.indexOf('.') > -1) {
            let length = fixedNumber.length - 1;
            let char = fixedNumber[length];
            if (char == '.' || char == '0') {
                fixedNumber = fixedNumber.substr(0, length);
            }
            else {
                break;
            }
        }

        var reg = fixedNumber.indexOf(".") > -1 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(?:\d{3})+$)/g;
        return fixedNumber.replace(reg, "$1,");
    }
}
