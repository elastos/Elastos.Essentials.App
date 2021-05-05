/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Component, OnInit, ViewChild } from '@angular/core';
import { Util } from '../../model/Util';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from '../../services/native.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWalletId: string = "1";
    public masterWalletType: string = "";
    public readonly: string = "";
    public currentLanguageName: string = "";
    public isShowDeposit: boolean = false;
    public fee: number = 0;
    public walletInfo = {};
    public password: string = "";
    public available = 0;
    public settings = [
        {
            route: "/wallet/launcher",
            title: this.translate.instant("wallet.settings-add-wallet"),
            subtitle: this.translate.instant("wallet.settings-add-wallet-subtitle"),
            icon: '/assets/wallet/settings/wallet.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/wallet.svg',
            type: 'launcher'
        },
        {
            route: "/wallet/wallet-manager",
            title: this.translate.instant("wallet.settings-my-wallets"),
            subtitle: this.translate.instant("wallet.settings-my-wallets-subtitle"),
            icon: '/assets/wallet/settings/wallet.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/wallet.svg',
            type: 'wallet-manager'
        },
        {
            route: "/wallet/settings/currency-select",
            title: this.translate.instant("wallet.settings-currency"),
            subtitle: this.translate.instant("wallet.settings-currency-subtitle"),
            icon: '/assets/wallet/settings/dollar.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/dollar.svg',
            type: 'currency-select'
        },
    ];

    public Util = Util;

    constructor(
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private native: Native
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
      this.titleBar.setTitle(this.translate.instant("wallet.settings-title"));
    }

    go(item) {
        item.type === 'launcher' ? this.native.go(item.route, { from: 'settings' }) : this.native.go(item.route);
    }
}
