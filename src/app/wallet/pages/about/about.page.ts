import { Component, OnInit } from '@angular/core';
import { WalletManager } from '../../services/wallet.service';
import { AppService } from '../../services/app.service';
import { Native } from '../../services/native.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.page.html',
    styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {
    public version = "1.0.0";
    public spvVersion = "0";
    // public commitVersion = "v0.12";
    constructor(public walletManager: WalletManager,
                public appService: AppService,
                public native: Native) {
        this.init();
    }

    ngOnInit() {
    }

    async init() {
        this.version = "0.0.0"; // TODO
        this.spvVersion = await this.walletManager.spvBridge.getVersion();
    }

    goWebsite() {
        this.native.openUrl("http://www.elastos.org");
    }

}
