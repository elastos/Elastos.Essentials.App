import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from '../../services/native.service';
import { WalletCreationService } from '../../services/walletcreation.service';

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

    createStandardWallet() {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = 1; // new
        this.native.go("/wallet/wallet-create");
    }

    importStandardWallet() {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = 2; // import
        this.native.go("/wallet/wallet-create");
    }

    createMultiSigWallet() {
        this.native.go("/wallet/multisig/create");
    }

    createLedgerWallet() {
        this.native.go("/wallet/ledger/scan");
    }
}
