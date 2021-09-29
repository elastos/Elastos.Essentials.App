import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
    selector: 'page-menu',
    templateUrl: 'menu.html',
    styleUrls: ['menu.scss']
})
export class MenuPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private globalStartupService: GlobalStartupService
    ) {
    }

    // onExit(data: IABExitData) {
    //     throw new Error('Method not implemented.');
    // }

    ionViewWillEnter() {
        // this.titleBar.setTitle("Menu Options");
        // this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
        //     await this.nav.navigateBack();
        //     // DAppBrowser.sbrowser.show();
        // });
    }

    ionViewDidEnter() {

    }

    async goback() {
        await this.nav.navigateBack();
    }

}
