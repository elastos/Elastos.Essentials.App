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

import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Config } from '../../../config/Config';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { WalletEditionService } from '../../../services/walletedition.service';
import { SubWallet } from '../../../model/wallets/SubWallet';
import { StandardCoinName, CoinType } from '../../../model/Coin';
import { Util } from '../../../model/Util';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { CurrencyService } from '../../../services/currency.service';
import { UiService } from '../../../services/ui.service';
import { StandardSubWallet } from '../../../model/wallets/StandardSubWallet';
import { IonSlides } from '@ionic/angular';
import { LocalStorage } from '../../../services/storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { NFT } from 'src/app/wallet/model/nft';
import { WalletPrefsService } from 'src/app/wallet/services/pref.service';
import { Subscription } from 'rxjs';
import { GlobalStartupService } from 'src/app/services/global.startup.service';


@Component({
    selector: 'app-wallet-home',
    templateUrl: './wallet-home.page.html',
    styleUrls: ['./wallet-home.page.scss'],
})
export class WalletHomePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', {static: false}) slider: IonSlides;

    public masterWallet: MasterWallet = null;
    private activeWalletSubscription: Subscription = null;
    private activeNetworkSubscription: Subscription = null;
    private networkTemplate: string;

    // Helpers
    public Util = Util;
    public CoinType = CoinType;
    public SELA = Config.SELA;

    public hideRefresher = true;

    private updateInterval = null;

    public showNetworkOptions = false;
    // Dummy Current Network
    public currentNetwork = {
        id: 1,
        name: 'Elastos',
        logo: 'assets/wallet/coins/ela-black.svg',
    }
     // Dummy Network Options
    public networkOptions = [
        {
            id: 1,
            name: 'Elastos',
            logo: 'assets/wallet/coins/ela-black.svg',
        },
        /* {
            id: 2,
            name: 'HECO',
            logo: 'assets/wallet/coins/ela-black.svg',
        },
        {
            id: 3,
            name: 'BSC',
            logo: 'assets/wallet/coins/ela-black.svg',
        },
        {
            id: 4,
            name: 'Generic Network',
            logo: 'assets/wallet/coins/ela-black.svg',
        }, */
    ];

    public showWalletSelection = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public native: Native,
        public popupProvider: PopupProvider,
        public walletManager: WalletManager,
        private walletEditionService: WalletEditionService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        private prefs: WalletPrefsService,
        public theme: GlobalThemeService,
        public uiService: UiService,
        private storage: LocalStorage,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
        this.showRefresher();
        this.networkTemplate = this.prefs.getNetworkTemplate();
        this.activeWalletSubscription = this.walletManager.activeMasterWallet.subscribe((masterId) => {
          if (masterId) {
            this.masterWallet = this.walletManager.getActiveMasterWallet()
          }
        });
        this.activeNetworkSubscription = this.walletManager.activeNetwork.subscribe(networkName => {
            this.currentNetwork = this.networkOptions.find(netOpt => {
                // DIRTY TEMP WAITING FOR REAL MULTI NETWORK SUPPORT
                return netOpt.name == networkName;
            })
        });
    }

    showRefresher() {
        setTimeout(() => {
            this.hideRefresher = false;
        }, 4000);
    }

    ngOnDestroy() {
        if (this.activeWalletSubscription) {
            this.activeWalletSubscription.unsubscribe();
            this.activeWalletSubscription = null;
        }

        if (this.activeNetworkSubscription) {
            this.activeNetworkSubscription.unsubscribe();
            this.activeNetworkSubscription = null;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-home-title"));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "settings",
            iconPath: BuiltInIcon.SETTINGS
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if(icon.key === 'settings') {
                this.native.go('/wallet/settings');
            }
        });
    }

    ionViewDidEnter() {
        if (this.walletManager.getWalletsCount() > 0) {
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

    goCoinHome(masterWalletId: string, elastosChainCode: string) {
        this.native.go("/wallet/coin", { masterWalletId, elastosChainCode });
    }

    goSelectMasterWallet() {
      this.native.go("/wallet/wallet-manager");
    }

    public getPotentialActiveWallets(): MasterWallet[] {
        return this.walletManager.getWalletsList();
    }

    /**
     * Shows or hides the active wallet selection UI.
     */
    public toggleActiveWalletSelection() {
        this.showWalletSelection = !this.showWalletSelection;
        this.showNetworkOptions = false;
    }

    public selectActiveWallet(wallet: MasterWallet) {
        void this.walletManager.setActiveMasterWallet(wallet.id);
    }

    public selectActiveNetwork(network: string) {
        // TODO: Use network object, not string
        void this.walletManager.setActiveNetwork(network);
    }

    async updateCurrentWalletInfo() {
        await this.masterWallet.update();
        await this.masterWallet.updateERCTokenList(this.networkTemplate);
        this.masterWallet.getSubWalletBalance(StandardCoinName.ELA);
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
        return this.walletManager.getWalletsList().indexOf(masterWallet);
    }

    isStandardSubwallet(subWallet: SubWallet) {
        return subWallet instanceof StandardSubWallet;
    }

    closeRefreshBox() {
        this.uiService.returnedUser = true;
        void this.storage.setVisit(true);
    }

    public goNFTHome(masterWallet: MasterWallet, nft: NFT) {
        this.native.go("/wallet/coin-nft-home", {
            masterWalletId: masterWallet.id,
            contractAddress: nft.contractAddress
        });
    }
}
