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
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { TronSubWallet } from 'src/app/wallet/model/networks/tron/subwallets/tron.subwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { DefiService, StakingData } from 'src/app/wallet/services/evm/defi.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { AnySubWallet } from '../../../model/networks/base/subwallets/subwallet';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { LocalStorage } from '../../../services/storage.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

export type NetworkAssetInfo = {
    name: string,
    logo: string,
    balance: BigNumber, // raw balance
    balanceString: string, // display balance
    stakedBalance: number, // staked balance
    stakedBalanceString: string, // display staked balance
    subWallets: AnySubWallet[],
    stakingData: StakingData[],
}

export type NetworkWalletAssetInfo = {
    id: string,
    name: string,
    networks: NetworkAssetInfo[],
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

    public minAmount = 0.01; // Do not show if the subwallet amount less than 0.01 dollar.

    private totalSubwalletCount = 0;
    private updatedSubwalletCount = 0;

    private updateOnGoing = false;
    private exitPage = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public defiService: DefiService,
        public native: Native,
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

        let networks = this.networkService.getDisplayableNetworks();
        let masterWalletList = this.walletManager.getMasterWalletsList();

        for (let i = 0; i < networks.length && !this.exitPage; i++) {
            for (let j = 0; j < masterWalletList.length && !this.exitPage; j++) {
                try {
                    let networkWallet = await networks[i].createNetworkWallet(masterWalletList[j], false);
                    if (!networkWallet) continue;

                    let networkWalletIndex = this.findWalletIndex(networkWallet);

                    // Staking assets.
                    // if (updateBalance) {
                    //     await networkWallet.fetchStakingAssets();
                    // }
                    let stakingData = networkWallet.getStakingAssets();
                    // let stakedBalance = 0;
                    // for (let k = 0; k < stakingData.length; k++) {
                    //     stakedBalance += stakingData[k].amountUSD;
                    // }

                    let stakedBalance = 0;
                    if (networkWallet.network.key === 'elastos') {
                        let subwallet = networkWallet.getMainTokenSubWallet() as MainChainSubWallet;
                        if (subwallet) {
                            stakedBalance = await subwallet.getStakedBalance();
                        }
                    } else if (networkWallet.network.key === 'tron') {
                        let subwallet = networkWallet.getMainTokenSubWallet() as TronSubWallet;
                        if (subwallet) {
                            stakedBalance = await subwallet.getStakedBalance();
                        }
                    }

                    let subWallets = await this.getSubwalletsShouldShowOn(networkWallet, updateBalance);
                    if ((subWallets.length > 0) || (stakingData.length > 0)) {
                        // getDisplayBalanceInActiveCurrency including the staked assets.
                        let balanceBigNumber = networkWallet.getDisplayBalanceInActiveCurrency();
                        let stakedBalanceString = null;
                        if (stakedBalance) {
                            stakedBalanceString = this.getStakedBalanceInCurrency(stakedBalance, networkWallet);
                            balanceBigNumber = balanceBigNumber.plus(new BigNumber(stakedBalanceString));
                        }
                        let networkAssetInfo: NetworkAssetInfo = {
                            name: networks[i].name,
                            logo: networks[i].logo,
                            balance: balanceBigNumber,
                            balanceString: this.getAmountForDisplay(balanceBigNumber),
                            stakedBalance: stakedBalance,
                            stakedBalanceString: stakedBalanceString,
                            subWallets: subWallets,
                            stakingData: stakingData,
                        }

                        let networkIndex = this.assetsInfo[networkWalletIndex].networks.findIndex((network) => {
                            return network.name === networks[i].name;
                        })
                        if (networkIndex === -1) {
                            this.assetsInfo[networkWalletIndex].networks.push(networkAssetInfo);
                        } else {
                            this.assetsInfo[networkWalletIndex].networks[networkIndex] = networkAssetInfo;
                        }
                    } else {
                        // Remove old info if the network has no asset.
                        let networkIndex = this.assetsInfo[networkWalletIndex].networks.findIndex((network) => {
                            return network.name === networks[i].name;
                        })
                        if (networkIndex !== -1) {
                            this.assetsInfo[networkWalletIndex].networks.splice(networkIndex);
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

    // Find the specified index from assetsInfo array.
    // Create a new NetworkWalletAssetInfo if can not find it.
    private findWalletIndex(networkWallet: AnyNetworkWallet) {
        let networkWalletIndex = this.assetsInfo.findIndex((wallet) => {
            return wallet.id === networkWallet.masterWallet.id;
        })
        if (networkWalletIndex === -1) {
            this.assetsInfo.push({
                id: networkWallet.masterWallet.id,
                name: networkWallet.masterWallet.name,
                networks: [],
                balance: new BigNumber(0),
                balanceString: '0',
                show: false,
            });
            networkWalletIndex = this.assetsInfo.length - 1;
        }
        return networkWalletIndex;
    }

    // Get all subwallets that the balance is bigger than the threshold.
    private async getSubwalletsShouldShowOn(networkWallet: AnyNetworkWallet, updateBalance = false) {
        let showSubwalets = networkWallet.getSubWallets().filter(sw => sw.shouldShowOnHomeScreen());
        if (!updateBalance) {
            this.totalSubwalletCount += showSubwalets.length;
        }

        let subWallets: AnySubWallet[] = [];
        for (let index = 0; index < showSubwalets.length; index++) {
            if (updateBalance) {
                Logger.log('wallet', 'update networkWallet:', networkWallet.masterWallet.name, ' network:', networkWallet.network.key)
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
                // Sort by descending balance first. For equal balances, sort by ascending name
                if (b.getUSDBalance().gt(a.getUSDBalance()))
                    return 1;
                else if (b.getUSDBalance().lt(a.getUSDBalance()))
                    return -1;
                else
                    return a.getFriendlyName().localeCompare(a.getFriendlyName());
            });
        }

        return subWallets;
    }

    private updateTotalAssets() {
        let totalAmount = new BigNumber(0);
        for (let i = 0; i < this.assetsInfo.length; i++) {
            totalAmount = totalAmount.plus(this.assetsInfo[i].balance);
        }
        this.totalAmount = this.getAmountForDisplay(totalAmount);

        this.assetsInfo.sort((a, b) => {
            // Sort by descending balance first. For equal balances, sort by ascending name
            if (b.balance.gt(a.balance))
                return 1;
            else if (b.balance.lt(a.balance))
                return -1;
            else
                return a.name.localeCompare(a.name);
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
        return amount.decimalPlaces(decimalplace).toFixed();
    }

    public usdToCurrencyAmount(balance: string, decimalplace = -1): string {
        if (!balance) {
            return '...';
        }

        if (decimalplace == -1) {
            decimalplace = this.currencyService.selectedCurrency.decimalplace;
        }

        let curerentAmount = this.currencyService.usdToCurrencyAmount(new BigNumber(balance));
        return curerentAmount.decimalPlaces(decimalplace).toFixed();
    }

    public getStakedBalanceInCurrency(stakedBalance: number, networkWallet: AnyNetworkWallet) {
        let balance = CurrencyService.instance.getMainTokenValue(new BigNumber(stakedBalance),
            networkWallet.network, this.currencyService.selectedCurrency.symbol);
        return WalletUtil.getFriendlyBalance(balance);
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

    /**
     * Open tin.network in a browser view
     */
    public openStakedAssetsProvider() {
        this.defiService.openStakedAssetsProvider();
    }

    public getDefaultStakedAssetIcon(networkAssetInfo: NetworkAssetInfo) {
        return networkAssetInfo.logo;
    }
}
