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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { Network } from 'src/app/wallet/model/networks/network';
import { NFT } from 'src/app/wallet/model/nfts/nft';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletUIService } from 'src/app/wallet/services/wallet.ui.service';
import { Config } from '../../../config/Config';
import { MasterWallet } from '../../../model/wallets/masterwallet';
import { StandardSubWallet } from '../../../model/wallets/standard.subwallet';
import { AnySubWallet } from '../../../model/wallets/subwallet';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { LocalStorage } from '../../../services/storage.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletEditionService } from '../../../services/walletedition.service';


@Component({
    selector: 'app-wallet-home',
    templateUrl: './wallet-home.page.html',
    styleUrls: ['./wallet-home.page.scss'],
})
export class WalletHomePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;

    public masterWallet: MasterWallet = null;
    public networkWallet: NetworkWallet = null;
    private displayableSubWallets: AnySubWallet[] = null;

    private activeNetworkWalletSubscription: Subscription = null;
    private activeNetworkSubscription: Subscription = null;
    private subWalletsListChangeSubscription: Subscription = null;

    // Helpers
    public WalletUtil = WalletUtil;
    public CoinType = CoinType;
    public SELA = Config.SELA;

    public hideRefresher = true;

    private updateInterval = null;

    public shownSubWalletDetails: AnySubWallet = null;

    // Dummy Current Network
    public currentNetwork: Network = null;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public native: Native,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        public networkService: WalletNetworkService,
        private walletEditionService: WalletEditionService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        public theme: GlobalThemeService,
        public uiService: UiService,
        private walletNetworkUIService: WalletNetworkUIService,
        private walletUIService: WalletUIService,
        private storage: LocalStorage,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
        this.showRefresher();
        this.activeNetworkWalletSubscription = this.walletManager.activeNetworkWallet.subscribe((activeNetworkWallet) => {
            if (activeNetworkWallet) {
                this.networkWallet = activeNetworkWallet;
                this.refreshSubWalletsList();

                // Know when a subwallet is added or removed, to refresh our list
                this.subWalletsListChangeSubscription = this.networkWallet.subWalletsListChange.subscribe(() => {
                    this.refreshSubWalletsList();
                });
            }
        });
        this.activeNetworkSubscription = this.networkService.activeNetwork.subscribe(activeNetwork => {
            this.currentNetwork = activeNetwork;
        });
    }

    ngOnDestroy() {
        if (this.activeNetworkWalletSubscription) {
            this.activeNetworkWalletSubscription.unsubscribe();
            this.activeNetworkWalletSubscription = null;
        }

        if (this.activeNetworkSubscription) {
            this.activeNetworkSubscription.unsubscribe();
            this.activeNetworkSubscription = null;
        }

        if (this.subWalletsListChangeSubscription) {
            this.subWalletsListChangeSubscription.unsubscribe();
            this.subWalletsListChangeSubscription = null;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-home-title"));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "settings",
            iconPath: BuiltInIcon.SETTINGS
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if (icon.key === 'settings') {
                this.native.go('/wallet/settings');
            }
        });
    }

    ionViewDidEnter() {
        if (this.walletManager.getMasterWalletsCount() > 0) {
            void this.promptTransfer2IDChain();
        }

        this.startUpdateInterval();

        this.globalStartupService.setStartupScreenReady();
    }

    ionViewWillLeave() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
        if (this.native.popup) {
            this.native.popup.dismiss();
        }
    }

    private refreshSubWalletsList() {
        this.displayableSubWallets = this.networkWallet.getSubWallets().filter(sw => sw.shouldShowOnHomeScreen());
    }

    showRefresher() {
        setTimeout(() => {
            this.hideRefresher = false;
        }, 4000);
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

        // Not sure what this does but it throws an err using it
        // event.stopPropagation();
        return false;
    }

    goToWalletSettings(masterWallet: MasterWallet) {
        this.walletEditionService.modifiedMasterWalletId = masterWallet.id;
        this.native.go("/wallet/wallet-settings");
    }

    goCoinHome(masterWalletId: string, subWalletId: string) {
        this.native.go("/wallet/coin", { masterWalletId, subWalletId });
    }

    goSelectMasterWallet() {
        this.native.go("/wallet/wallet-manager");
    }

    public getPotentialActiveWallets(): NetworkWallet[] {
        return this.walletManager.getNetworkWalletsList();
    }

    public getDisplayableSubWallets(): AnySubWallet[] {
        return this.displayableSubWallets;
    }

    /**
     * Shows the wallet selector component to pick a different wallet
     */
    public pickOtherWallet() {
        void this.walletUIService.chooseActiveWallet();
    }

    public selectActiveWallet(wallet: NetworkWallet) {
        void this.walletManager.setActiveNetworkWallet(wallet);
    }

    public selectActiveNetwork(network: Network) {
        // TODO: Use network object, not string
        void this.networkService.setActiveNetwork(network);
    }

    async updateCurrentWalletInfo() {
        await this.networkWallet.update();
        this.currencyService.fetch();
    }

    startUpdateInterval() {
        if (this.updateInterval === null) {
            this.updateInterval = setInterval(() => {
                void this.updateCurrentWalletInfo();
            }, 30000);// 30s
        }
    }

    restartUpdateInterval() {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        this.startUpdateInterval();
    }

    async doRefresh(event) {
        if (!this.uiService.returnedUser) {
            this.uiService.returnedUser = true;
            await this.storage.setVisit(true);
        }
        this.restartUpdateInterval();
        void this.updateCurrentWalletInfo();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    async promptTransfer2IDChain() {
        if (this.walletManager.needToPromptTransferToIDChain) {
            void this.popupProvider.ionicAlert('wallet.text-did-balance-not-enough');
            await this.walletManager.setHasPromptTransfer2IDChain();
        }
    }

    getWalletIndex(masterWallet: MasterWallet): number {
        return this.walletManager.getMasterWalletsList().indexOf(masterWallet);
    }

    isStandardSubwallet(subWallet: AnySubWallet) {
        return subWallet instanceof StandardSubWallet;
    }

    closeRefreshBox() {
        this.uiService.returnedUser = true;
        void this.storage.setVisit(true);
    }

    public goNFTHome(networkWallet: NetworkWallet, nft: NFT) {
        this.native.go("/wallet/coin-nft-home", {
            masterWalletId: networkWallet.masterWallet.id,
            contractAddress: nft.contractAddress
        });
    }

    public viewTransactions(event, subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        event.preventDefault();
        event.stopPropagation();

        this.goCoinHome(subWallet.networkWallet.id, subWallet.id)
    }

    public pickNetwork() {
        void this.walletNetworkUIService.chooseActiveNetwork();
    }

    public onSubWalletClicked(subWallet: AnySubWallet) {
        // If there is not specific details to show for this wallet, directly show the transactions
        // list. Otherwise, show details.
        if (this.shouldShowSubWalletDetails(subWallet)) { // Currently shown --> hide details
            this.shownSubWalletDetails = null;
        }
        else {
            this.shownSubWalletDetails = subWallet;
        }
    }

    public shouldShowSubWalletDetails(subWallet: AnySubWallet): boolean {
        return this.shownSubWalletDetails && this.shownSubWalletDetails.id === subWallet.id;
    }

    public earn(event, subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        event.preventDefault();
        event.stopPropagation();

        this.native.go("/wallet/coin-earn", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        });
    }

    public swap(event, subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        event.preventDefault();
        event.stopPropagation();

        this.native.go("/wallet/coin-swap", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        });
    }

    public bridge(event, subWallet: AnySubWallet) {
        // Prevent from subwallet main div to get the click (do not open transactions list)
        event.preventDefault();
        event.stopPropagation();

        this.native.go("/wallet/coin-bridge", {
            masterWalletId: subWallet.networkWallet.masterWallet.id,
            subWalletId: subWallet.id
        });
    }
}
