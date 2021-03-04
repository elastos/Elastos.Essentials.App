import { Component, OnInit, ViewChild } from '@angular/core';
import { AppService } from '../../services/app.service';
import { Native } from '../../services/native.service';
import { WalletCreationService } from '../../services/walletcreation.service';
import { WalletManager } from '../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';

declare let appManager: AppManagerPlugin.AppManager;

@Component({
    selector: 'app-launcher',
    templateUrl: './launcher.page.html',
    styleUrls: ['./launcher.page.scss'],
})
export class LauncherPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    constructor(
        private appService: AppService,
        public native: Native,
        private walletCreationService: WalletCreationService,
        private walletManager: WalletManager,
        public translate: TranslateService,
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('wallet'));

        /* TODO @chad if (this.walletManager.getWalletsCount() === 0) {
            this.appService.setBackKeyVisibility(false);
        } else {
            this.appService.setBackKeyVisibility(true);
        }*/
    }

    ionViewWillLeave() {
    }

    onNext(type: number) {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = type;
        this.native.go("/wallet-create");
    }
}
