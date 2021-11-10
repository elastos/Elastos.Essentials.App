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
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
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
    subWallets: AnySubWallet[],
}

export type NetworkWalletAssetInfo = {
    id: string,
    name: string,
    networks: NetworkAssetInfo[],
    networksCount: number,
    balance: BigNumber,
    balanceString: string,
    show: boolean,
}

@Component({
    selector: 'app-wallet-asset',
    templateUrl: './wallet-asset.page.html',
    styleUrls: ['./wallet-asset.page.scss'],
})
export class WalletAssetPage implements OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;

    public assetsInfo: NetworkWalletAssetInfo[] = [];
    public totalAmount = '';

    public minAmount = 1; // Do not show if the subwallet amount less than 1 dollar.

    private totalSubwalletCount = 0;
    private updatedSubwalletCount = 0;

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
        void this.initAsset();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async initAsset() {
        await this.updateAssetsInfo();
        setTimeout(() => {
            void this.updateAssetsInfo(true);
        }, 500);
    }

    async updateAssetsInfo(updateBalance = false) {
        if (this.updateOnGoing) {
            Logger.warn('wallet', 'Updating assets Info...')
            return;
        }
        this.updateOnGoing = true;
        if (updateBalance) {
            this.updatedSubwalletCount = 0;
        } else {
            this.totalSubwalletCount = 0;
        }

        let networks = this.networkService.getAvailableNetworks();
        let masterWalletList = this.walletManager.getMasterWalletsList();

        for (let i = 0; i < networks.length && !this.exitPage; i++) {
            for (let j = 0; j < masterWalletList.length && !this.exitPage; j++) {
                let networkWallet = await networks[i].createNetworkWallet(masterWalletList[j], false);

                try {
                    let networkWalletIndex = this.assetsInfo.findIndex( (wallet) => {
                        return wallet.id === networkWallet.masterWallet.id;
                    })
                    if (networkWalletIndex === -1) {
                        this.assetsInfo.push({
                            id: networkWallet.masterWallet.id,
                            name: networkWallet.masterWallet.name,
                            networks: [],
                            networksCount: 0,
                            balance: new BigNumber(0),
                            balanceString: '0',
                            show: false,
                        });
                        networkWalletIndex = this.assetsInfo.length - 1;
                    }

                    let showSubwalets = networkWallet.getSubWallets().filter(sw => sw.shouldShowOnHomeScreen());
                    if (!updateBalance) {
                        this.totalSubwalletCount += showSubwalets.length;
                    }

                    let subWallets = [];
                    for (let index = 0; index < showSubwalets.length; index++) {
                        if (updateBalance) {
                            await showSubwalets[index].updateBalance();
                            this.zone.run(() => {
                                this.updatedSubwalletCount++;
                            });
                        }

                        let usdBalance = showSubwalets[index].getUSDBalance();
                        if (usdBalance.gte(this.minAmount)) {
                            subWallets.push(showSubwalets[index]);
                        }
                    }

                    if (subWallets.length > 0) {
                        subWallets.sort((a, b) => {
                            if (b.getUSDBalance().gte(a.getUSDBalance())) return 1;
                            else return -1;
                        });

                        let balanceBigNumber = networkWallet.getDisplayBalanceInActiveCurrency();
                        let netowrkAssetInfo : NetworkAssetInfo = {
                            name: networks[i].name,
                            balance: balanceBigNumber,
                            balanceString: this.getAmountForDisplay(balanceBigNumber),
                            subWallets: subWallets,
                        }

                        let networkIndex = this.assetsInfo[networkWalletIndex].networks.findIndex( (network) => {
                            return network.name === networks[i].name;
                        })
                        if (networkIndex === -1) {
                            this.assetsInfo[networkWalletIndex].networks.push(netowrkAssetInfo);
                            this.assetsInfo[networkWalletIndex].networksCount = this.assetsInfo[networkWalletIndex].networks.length;
                        } else {
                            this.assetsInfo[networkWalletIndex].networks[networkIndex] = netowrkAssetInfo;
                        }
                    } else {
                        // Remove old info if the network has no asset.
                        let networkIndex = this.assetsInfo[networkWalletIndex].networks.findIndex( (network) => {
                            return network.name === networks[i].name;
                        })
                        if (networkIndex !== -1) {
                            this.assetsInfo[networkWalletIndex].networks.splice(networkIndex);
                            this.assetsInfo[networkWalletIndex].networksCount = this.assetsInfo[networkWalletIndex].networks.length;
                        }
                    }
                    this.zone.run(() => {
                        this.updateNetworkWalletAssets(this.assetsInfo[networkWalletIndex]);
                        this.updateTotalAssets();
                    })
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
        for (let i = 0; i < this.assetsInfo.length; i++) {
            totalAmount = totalAmount.plus(this.assetsInfo[i].balance);
        }
        this.totalAmount = this.getAmountForDisplay(totalAmount);

        this.assetsInfo.sort((a, b) => {
            if (b.balance.gt(a.balance)) return 1;
            else return -1;
        })
    }

    private updateNetworkWalletAssets(networkWalletInfo: NetworkWalletAssetInfo) {
        let networkWalletTotalBalance = new BigNumber(0);
        for (let i = 0; i < networkWalletInfo.networks.length; i++) {
            networkWalletTotalBalance = networkWalletTotalBalance.plus(networkWalletInfo.networks[i].balance);
        }
        networkWalletInfo.balance = networkWalletTotalBalance;
        networkWalletInfo.balanceString = this.getAmountForDisplay(networkWalletTotalBalance);

        networkWalletInfo.networks.sort((a, b) => {
            if (b.balance.gte(a.balance)) return 1;
            else return -1;
        })
    }

    private getAmountForDisplay(amount: BigNumber) {
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
        }, 500);
    }

    public getUpdatingProgressInfo() {
        return (100 * this.updatedSubwalletCount / this.totalSubwalletCount).toFixed(0);
    }
}
