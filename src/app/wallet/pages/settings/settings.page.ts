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
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { MenuSheetMenu } from '../../../components/menu-sheet/menu-sheet.component';
import { ImportWalletType } from '../../model/masterwallets/wallet.types';
import { Native } from '../../services/native.service';
import { WalletCreationService } from '../../services/walletcreation.service';

type Action = () => Promise<void> | void;

type SettingsEntry = {
    routeOrAction: string | Action;
    title: string;
    subtitle: string;
    icon: string;
    iconDarkmode: string;
    type: string
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWalletId = "1";
    public masterWalletType = "";
    public readonly = "";
    public currentLanguageName = "";
    public isShowDeposit = false;
    public fee = 0;
    public walletInfo = {};
    public password = "";
    public available = 0;
    private autoOpenCreateWallet = false;
    public settings: SettingsEntry[] = [
        {
            routeOrAction: () => this.addWallet(),
            title: this.translate.instant("wallet.settings-add-wallet"),
            subtitle: this.translate.instant("wallet.settings-add-wallet-subtitle"),
            icon: '/assets/wallet/settings/wallet.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/wallet.svg',
            type: 'launcher'
        },
        {
            routeOrAction: "/wallet/wallet-manager",
            title: this.translate.instant("wallet.settings-my-wallets"),
            subtitle: this.translate.instant("wallet.settings-my-wallets-subtitle"),
            icon: '/assets/wallet/settings/wallet.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/wallet.svg',
            type: 'wallet-manager'
        },
        {
            routeOrAction: "/wallet/settings/currency-select",
            title: this.translate.instant("wallet.settings-currency"),
            subtitle: this.translate.instant("wallet.settings-currency-subtitle"),
            icon: '/assets/wallet/settings/currency.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/currency.svg',
            type: 'currency-select'
        },
        {
            routeOrAction: "/wallet/settings/manage-networks",
            title: this.translate.instant("wallet.settings-manage-networks"),
            subtitle: this.translate.instant("wallet.settings-manage-networks-subtitle"),
            icon: '/assets/wallet/settings/custom-networks.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/custom-networks.svg',
            type: 'manage-networks'
        },
    ];

    constructor(
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private native: Native,
        private router: Router,
        private walletCreationService: WalletCreationService,
        private globalNativeService: GlobalNativeService,
    ) {
    }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            // Are we called in order to create a new wallet? If so, we show the add wallet sheet when entering.
            this.autoOpenCreateWallet = navigation.extras.state.createWallet;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.settings-title"));

        if (this.autoOpenCreateWallet) {
            this.addWallet();
            this.autoOpenCreateWallet = false;
        }
    }

    ionViewDidEnter() {
        // Hide splash screen if the wallet is the startup screen.
        GlobalStartupService.instance.setStartupScreenReady();
    }

    public go(item: SettingsEntry) {
        if (typeof item.routeOrAction === "string") {
            if (item.type === 'launcher')
                this.native.go(item.routeOrAction, { from: 'settings' })
            else
                this.native.go(item.routeOrAction);
        }
        else {
            void item.routeOrAction();
        }
    }

    private addWallet() {
        let menu: MenuSheetMenu = {
            title: this.translate.instant("wallet.settings-add-wallet"),
            items: [
                {
                    title: this.translate.instant("wallet.settings-add-wallet-standard-wallet"),
                    items: [
                        {
                            title: this.translate.instant("wallet.settings-add-wallet-new-wallet"),
                            routeOrAction: () => {
                                this.createStandardWallet();
                            }
                        },
                        {
                            title: this.translate.instant("wallet.import-wallet"),
                            items: [
                                {
                                    title: this.translate.instant("wallet.settings-add-wallet-mnemonic"),
                                    routeOrAction: () => {
                                        this.importStandardWallet(ImportWalletType.MNEMONIC);
                                    }
                                },
                                {
                                    title: this.translate.instant("wallet.privatekey"),
                                    routeOrAction: () => {
                                        // TODO: differenciate from mnemonic menu item just above
                                        this.importStandardWallet(ImportWalletType.PRIVATEKEY);
                                    }
                                },
                                {
                                    title: this.translate.instant("Keystore"),
                                    routeOrAction: () => {
                                        this.walletCreationService.reset();
                                        this.walletCreationService.isMulti = false;
                                        this.walletCreationService.type = 2; // import
                                        this.native.go("/wallet/wallet-import-keystorespv");
                                    }
                                },
                            ]
                        }
                    ]
                },
                {
                    title: this.translate.instant("wallet.settings-add-wallet-hardware-wallet"),
                    items: [
                        {
                            icon: "assets/wallet/icons/ledger.svg",
                            title: "Ledger Nano X",
                            routeOrAction: "/wallet/ledger/scan"
                        }
                    ]
                },
                {
                    title: this.translate.instant("wallet.settings-add-wallet-multi-sig-wallet"),
                    items: [
                        {
                            title: "Elastos Main Chain",
                            routeOrAction: "/wallet/multisig/standard/create"
                        }
                    ]
                }
            ]
        };

        void this.globalNativeService.showGenericBottomSheetMenuChooser(menu);
    }


    createStandardWallet() {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = 1; // new
        this.native.go("/wallet/wallet-create");
    }

    importStandardWallet(type: ImportWalletType) {
        this.walletCreationService.reset();
        this.walletCreationService.isMulti = false;
        this.walletCreationService.type = 2; // import
        this.native.go("/wallet/wallet-create", { importType: type });
    }
}
