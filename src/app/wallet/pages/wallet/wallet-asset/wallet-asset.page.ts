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

import { Component, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BigNumber } from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { AnySubWallet } from '../../../model/wallets/subwallet';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { LocalStorage } from '../../../services/storage.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

export type NetworkAssetInfo = {
    name: string,
    balance: BigNumber,
    balanceString: string,
    subWallets : AnySubWallet[],
}

export type NetworkWalletAssetInfo = {
    name: string,
    networks: any,
    networksCount: number,
    balance: BigNumber,
    balanceString: string,
    show: boolean,
}

export type AssetInfo = {
    [k: string]: NetworkWalletAssetInfo
}

@Component({
    selector: 'app-wallet-asset',
    templateUrl: './wallet-asset.page.html',
    styleUrls: ['./wallet-asset.page.scss'],
})
export class WalletAssetPage implements OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;

    public assetsInfo:AssetInfo = {};
    public totalAmount = '';

    private updateOnGoing = false;
    private exitPage = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public native: Native,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        public networkService: WalletNetworkService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        public theme: GlobalThemeService,
        public uiService: UiService,
        private storage: LocalStorage,
        private zone: NgZone,
    ) {
    }

    ngOnDestroy() {
        this.exitPage = true;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-asset-title"));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "settings",
            iconPath: BuiltInIcon.SETTINGS
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if (icon.key === 'settings') {
                this.native.go('/wallet/settings');
            }
        });

        void this.updateAssetsInfo();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    handleItem(key: string) {
        switch (key) {
            case 'settings':
                this.goToGeneralSettings();
                break;
        }
    }

    goToGeneralSettings() {
        this.native.go('/wallet/settings');
        return false;
    }

    // TODO: Get balance from cache?
    async updateAssetsInfo(update = false) {
        if (this.updateOnGoing) {
            Logger.warn('wallet', 'Updating assets Info...')
            return;
        }
        this.updateOnGoing = true;

        let networks = this.networkService.getAvailableNetworks();

        for (let i = 0; i < networks.length && !this.exitPage; i++) {
            let masterWalletList = this.walletManager.getMasterWalletsList();
            for (let j = 0; j < masterWalletList.length && !this.exitPage; j++) {
                let networkWallet = await networks[i].createNetworkWallet(masterWalletList[j], false);

                try {
                    // TODO: updateBalance too slow.
                    if (update) {
                        await networkWallet.updateBalance();
                    }

                    if (!this.assetsInfo[networkWallet.masterWallet.id]) {
                        this.assetsInfo[networkWallet.masterWallet.id] = {
                            name: networkWallet.masterWallet.name,
                            networks : {},
                            networksCount: 0,
                            balance: new BigNumber(0),
                            balanceString:'',
                            show:true,
                        }
                    }

                    let showSubwalets = networkWallet.getSubWallets().filter(sw => sw.shouldShowOnHomeScreen());

                    let subWallets = [];
                    for (let index = 0; index < showSubwalets.length; index++) {
                        let usdBalance = showSubwalets[index].getUSDBalance();
                        if (usdBalance.gte(1)) {
                            subWallets[showSubwalets[index].id] = showSubwalets[index];
                        }
                    }

                    if (Object.keys(subWallets).length > 0) {
                        let balanceBigNumber = networkWallet.getDisplayBalanceInActiveCurrency();

                        this.zone.run(() => {
                            this.assetsInfo[networkWallet.masterWallet.id].networks[networks[i].name] = {
                                name: networks[i].name,
                                balance: balanceBigNumber,
                                balanceString: this.getAmountForDisplay(balanceBigNumber),
                                subWallets: subWallets,
                            }
                            this.assetsInfo[networkWallet.masterWallet.id].networksCount = Object.keys(this.assetsInfo[networkWallet.masterWallet.id].networks).length;

                            this.updateNetworkWalletAssets(this.assetsInfo[networkWallet.masterWallet.id]);
                            this.updateTotalAssets();
                        })
                    } else {
                        // Remove old info if the network has no asset.
                        if (this.assetsInfo[networkWallet.masterWallet.id].networks[networks[i].name]) {
                            delete this.assetsInfo[networkWallet.masterWallet.id].networks[networks[i].name];
                            this.assetsInfo[networkWallet.masterWallet.id].networksCount--;

                            this.updateNetworkWalletAssets(this.assetsInfo[networkWallet.masterWallet.id]);
                            this.updateTotalAssets();
                        }
                    }
                }
                catch (err) {
                    Logger.warn('wallet', 'Update Wallet balance error:', err)
                }
            }
        }
        this.updateOnGoing = false;
    }

    private updateTotalAssets() {
        let totalAmount = new BigNumber(0);
        for (let key in this.assetsInfo) {
            totalAmount = totalAmount.plus(this.assetsInfo[key].balance);
        }
        this.totalAmount = this.getAmountForDisplay(totalAmount);
    }

    private updateNetworkWalletAssets(networkWalletInfo: NetworkWalletAssetInfo) {
        let networkWalletTotalBalance = new BigNumber(0);
        for (let key in networkWalletInfo.networks) {
            networkWalletTotalBalance = networkWalletTotalBalance.plus(networkWalletInfo.networks[key].balance);
        }
        networkWalletInfo.balance = networkWalletTotalBalance;
        networkWalletInfo.balanceString = this.getAmountForDisplay(networkWalletTotalBalance);
    }

    private getAmountForDisplay(amount:BigNumber) {
        let decimalplace = 3;
        if (CurrencyService.instance.selectedCurrency && CurrencyService.instance.selectedCurrency.decimalplace) {
            decimalplace = CurrencyService.instance.selectedCurrency.decimalplace;
        }
        return amount.decimalPlaces(decimalplace).toString();
    }

    async doRefresh(event) {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            await this.storage.setVisit(true);
        }
        await this.updateAssetsInfo(true);
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }
}
