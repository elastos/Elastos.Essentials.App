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

import { Component, OnInit, ViewChild, OnDestroy, NgZone } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { NFT } from 'src/app/wallet/model/nft';
import { WalletPrefsService } from 'src/app/wallet/services/pref.service';


@Component({
    selector: 'app-wallet-home',
    templateUrl: './wallet-home.page.html',
    styleUrls: ['./wallet-home.page.scss'],
})
export class WalletHomePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', {static: false}) slider: IonSlides;

    public slideOpts = {
        initialSlide: 0,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1.1
    };

    public masterWallet: MasterWallet = null;
    public masterWalletList: MasterWallet[] = [];
    public isSingleWallet = false;

    private networkTemplate: string;

    private walletChangedSubscription: Subscription = null;

    // Helpers
    public Util = Util;
    public CoinType = CoinType;
    public SELA = Config.SELA;

    public hideRefresher = true;

    private updateInterval = null;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        private events: Events,
        public native: Native,
        public popupProvider: PopupProvider,
        public walletManager: WalletManager,
        private walletEditionService: WalletEditionService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        private prefs: WalletPrefsService,
        public theme: GlobalThemeService,
        public uiService: UiService,
        private zone: NgZone,
        private storage: LocalStorage,
    ) {
    }

    ngOnInit() {
        this.showRefresher();
        this.updateWallet();
        this.networkTemplate = this.prefs.getNetworkTemplate();

        this.walletChangedSubscription = this.events.subscribe("masterwalletcount:changed", (result) => {
            Logger.log("wallet", "masterwalletcount:changed event received result:", result);
            this.zone.run(() => {
                this.updateWallet();

                if (result.action === 'add') {
                    const index = this.masterWalletList.findIndex(e => e.id === result.walletId);
                    if (index) {
                        setTimeout(() => {
                            if (this.slider) 
                                void this.slider.slideTo(index);
                        }, 1000);
                    }
                }
            });
        });
    }

    showRefresher() {
        setTimeout(() => {
            this.hideRefresher = false;
        }, 4000);
    }

    updateWallet() {
        this.masterWalletList = this.walletManager.getWalletsList();
        switch (this.masterWalletList.length) {
            case 1:
                this.isSingleWallet = true;
                this.masterWallet = this.masterWalletList[0];
                break;
            default:
                this.isSingleWallet = false;
                this.masterWallet = this.masterWalletList[0];
        }
    }

    ngOnDestroy() {
        this.walletChangedSubscription.unsubscribe();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-home-title"));
        this.titleBar.setNavigationMode(null);
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

    goCoinHome(masterWalletId: string, chainId: string) {
        this.native.go("/wallet/coin", { masterWalletId, chainId });
    }

    async updateCurrentWalletInfo() {
        let curMasterWallet: MasterWallet = null;
        if (this.isSingleWallet) {
            curMasterWallet = this.masterWallet;
        } else {
            const index = await this.slider.getActiveIndex();
            curMasterWallet = this.masterWalletList[index];
        }

        await curMasterWallet.update();
        await curMasterWallet.updateERCTokenList(this.networkTemplate);
        curMasterWallet.getSubWalletBalance(StandardCoinName.ELA);
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
