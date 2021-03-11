import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Native } from './native.service';
import { Injectable, NgZone } from '@angular/core';
import { CoinTransferService } from './cointransfer.service';
import * as moment from 'moment';
import { Events } from './events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

export enum ScanType {
    Address     = 1,
    Publickey   = 2,
    PrivateKey  = 3,
}

@Injectable({
    providedIn: 'root'
})
export class AppService {
    private app_version = '';

    constructor(
        private zone: NgZone,
        private translate: TranslateService,
        public events: Events,
        public native: Native,
        private navCtrl: NavController,
        private coinTransferService: CoinTransferService,
        private theme: GlobalThemeService
    ) {
    }

    public async init() {
        // Listen to title bar events
        /* TODO @chad
        titleBarManager.addOnItemClickedListener((menuIcon) => {
            if (menuIcon.key === "back") {
              this.titlebarBackButtonHandle();
            } else if (menuIcon.key === "backToHome") {
                this.native.go('/wallet-home');
            }
        });
        */
    }

    public setTitleBarTitle(title: string) {
        // TODO @chad titleBarManager.setTitle(this.translate.instant(title));
    }

    async scan(type: ScanType) {
        let res = await essentialsIntent.sendIntent('https://scanner.elastos.net/scanqrcode', {});
        let content: string = res.result.scannedContent;

        // Some address star with "xxx:", eg "etherum:"
        const index = content.indexOf(':');
        if (index !== -1) {
            content = content.substring(index + 1);
        }
        console.log('Got scan result:', content);

        switch (type) {
            case ScanType.Address:
                this.events.publish('address:update', content);
                break;
            case ScanType.Publickey:
                this.events.publish('publickey:update', content);
                break;
            case ScanType.PrivateKey:
                this.events.publish('privatekey:update', content);
                break;
        }
    }
}
