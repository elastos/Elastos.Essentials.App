import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WalletUIService } from 'src/app/wallet/services/wallet.ui.service';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;
@Component({
    selector: 'page-menu',
    templateUrl: 'menu.html',
    styleUrls: ['menu.scss']
})
export class MenuPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public browsedAppInfo: BrowsedAppInfo = null;
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
    private browsedAppInfoSub: Subscription = null;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private native: GlobalNativeService,
        public favoritesService: FavoritesService,
        public dappBrowserService: DappBrowserService,
        public walletNetworkService: WalletNetworkService,
        private walletNetworkUIService: WalletNetworkUIService,
        public walletService: WalletService,
        private walletUIService: WalletUIService,
        private globalIntentService: GlobalIntentService,
        private clipboard: Clipboard,
        private globalNative: GlobalNativeService
    ) {
    }


    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("dappbrowser.menu-title"));
        this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
            key: "close",
            iconPath: BuiltInIcon.CLOSE
        });

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = () => {
            void this.goback();
        });

        this.browsedAppInfoSub = this.dappBrowserService.activeBrowsedAppInfo.subscribe(browsedApp => {
            this.zone.run(() => {
                this.browsedAppInfo = browsedApp;
            });
        });

        Logger.log("dappbrowser", "Showing menu for browsed app", this.browsedAppInfo);
    }

    ionViewWillLeave() {
        this.browsedAppInfoSub.unsubscribe();
        this.browsedAppInfoSub = null;
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    ionViewDidEnter() {
    }

    async goback() {
        await this.nav.navigateBack();
    }

    public isInFavorites(): boolean {
        if (!this.browsedAppInfo)
            return false;

        return !!this.favoritesService.findFavoriteByUrl(this.browsedAppInfo.url);
    }

    public async addToFavorites() {
        await this.favoritesService.addToFavorites(this.browsedAppInfo);
        this.native.genericToast('dappbrowser.added-to-favorites');
    }

    public async removeFromFavorites() {
        let existingFavorite = this.favoritesService.findFavoriteByUrl(this.browsedAppInfo.url);
        await this.favoritesService.removeFromFavorites(existingFavorite);
        this.native.genericToast('dappbrowser.removed-from-favorites');
    }

    public async pickNetwork() {
        if (await this.walletNetworkUIService.chooseActiveNetwork())
            void this.goback(); // Exit menu after switching the network (most frequent case is user wants to exit)
    }

    public async pickWallet() {
        if (await this.walletUIService.chooseActiveWallet())
            void this.goback(); // Exit menu after switching the wallet (most frequent case is user wants to exit)
    }

    public openExternal() {
        void this.globalIntentService.sendIntent('openurl', { url: this.browsedAppInfo.url });
    }

    public reloadPage() {
        void dappBrowser.reload();
        void this.goback();
    }

    public copyUrl() {
        void this.clipboard.copy(this.browsedAppInfo.url);
        this.globalNative.genericToast('common.copied-to-clipboard', 2000, "success");
    }

    public shareUrl() {
        void this.globalIntentService.sendIntent("share", {
            title: this.browsedAppInfo.title,
            url: this.browsedAppInfo.url
        });
    }

    /**
     * Tells if the HTML header was loaded yet or not.
     */
    public appMetaLoaded(): boolean {
        return this.browsedAppInfo && this.browsedAppInfo.title !== "";
    }

    public getActiveNetworkLogo(): string {
        if (this.walletNetworkService.activeNetwork.value)
            return this.walletNetworkService.activeNetwork.value.logo;
        else
            return transparentPixelIconDataUrl();
    }

    public getActiveNetworkName(): string {
        if (this.walletNetworkService.activeNetwork.value)
            return this.walletNetworkService.activeNetwork.value.name;
        else
            return "";
    }
}
