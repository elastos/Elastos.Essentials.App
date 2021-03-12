import { Native } from './native.service';
import { Injectable, ViewChild } from '@angular/core';
import { Events } from './events.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

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
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    private app_version = '';

    constructor(
        public events: Events,
        public native: Native,
    ) {
    }

    public async init() {
    }

    setTitleBarTitle(title: string) {
        this.titleBar.setTitle(title);
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
