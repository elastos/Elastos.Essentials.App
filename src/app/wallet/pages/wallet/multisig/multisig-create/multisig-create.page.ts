import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from '../../../../services/native.service';

@Component({
    selector: 'app-multisig-create',
    templateUrl: './multisig-create.page.html',
    styleUrls: ['./multisig-create.page.scss'],
})
export class MultiSigCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public useBackNav = false;

    constructor(
        public native: Native,
        public translate: TranslateService,
        private theme: GlobalThemeService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTheme('#732cd0', TitleBarForegroundMode.LIGHT)
        this.titleBar.setTitle('New multi-sig wallet');
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {
        this.theme.activeTheme.subscribe((activeTheme) => {
            this.titleBar.setTitleBarTheme(activeTheme);
        });
    }

    createStandardMultiSigWallet() {
        this.native.go("/wallet/multisig/standard/create");
    }
}
