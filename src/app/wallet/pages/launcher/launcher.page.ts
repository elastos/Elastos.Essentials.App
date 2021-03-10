import { Component, OnInit, ViewChild } from '@angular/core';
import { AppService } from '../../services/app.service';
import { Native } from '../../services/native.service';
import { WalletCreationService } from '../../services/walletcreation.service';
import { WalletManager } from '../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Router } from '@angular/router';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let appManager: AppManagerPlugin.AppManager;

@Component({
    selector: 'app-launcher',
    templateUrl: './launcher.page.html',
    styleUrls: ['./launcher.page.scss'],
})
export class LauncherPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public useBackNav = false; 

    constructor(
        private appService: AppService,
        public native: Native,
        private walletCreationService: WalletCreationService,
        private walletManager: WalletManager,
        public translate: TranslateService,
        private router: Router,
        private theme: GlobalThemeService
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state) {
            if(navigation.extras.state.from === 'settings') {
                this.useBackNav = true;
            }
        } 
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('wallet'));
        this.useBackNav ? this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK) : this.titleBar.setNavigationMode(null);

   /*      if(this.walletManager.getWalletsCount() === 0) {
            this.titleBar.setNavigationMode(null)
        } else {
            this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK)
        } */
    }

    ionViewWillLeave() {
        this.theme.activeTheme.subscribe((activeTheme) => {
            this.titleBar.setTitleBarTheme(activeTheme);
        });
    }

    onNext(type: number) {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = type;
        this.native.go("/wallet-create");
    }
}
