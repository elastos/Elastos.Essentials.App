import { Component, OnInit, ViewChild } from '@angular/core';
import { Native } from '../../services/native.service';
import { WalletCreationService } from '../../services/walletcreation.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';


@Component({
    selector: 'app-launcher',
    templateUrl: './launcher.page.html',
    styleUrls: ['./launcher.page.scss'],
})
export class LauncherPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public useBackNav = false;

    constructor(
        public native: Native,
        private walletCreationService: WalletCreationService,
        public translate: TranslateService,
        private theme: GlobalThemeService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTheme('#732cd0', TitleBarForegroundMode.LIGHT)
        this.titleBar.setTitle(this.translate.instant('launcher.app-wallet'));
    }

    ionViewDidEnter() {
        this.globalStartupService.setStartupScreenReady();
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
        this.native.go("/wallet/wallet-create");
    }
}
