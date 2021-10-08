import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
    selector: 'page-menu',
    templateUrl: 'menu.html',
    styleUrls: ['menu.scss']
})
export class MenuPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public browsedAppInfo: BrowsedAppInfo = null;
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private native: GlobalNativeService,
        public favoritesService: FavoritesService,
        public dappBrowserService: DappBrowserService,
        private walletNetworksService: WalletNetworkService
    ) {
    }

    // onExit(data: IABExitData) {
    //     throw new Error('Method not implemented.');
    // }

    ionViewWillEnter() {
        this.titleBar.setTitle("Options");
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
        this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "close",
            iconPath:  BuiltInIcon.CLOSE
        });

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = () => {
            this.goback();
        });

        this.browsedAppInfo = this.dappBrowserService.getActiveBrowsedAppInfo();

        Logger.log("dappbrowser", "Showing menu for browsed app", this.browsedAppInfo);
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
        this.native.genericToast("Added to favorites");
    }

    public async removeFromFavorites() {
        let existingFavorite = this.favoritesService.findFavoriteByUrl(this.browsedAppInfo.url);
        await this.favoritesService.removeFromFavorites(existingFavorite);
        this.native.genericToast("Removed from favorites");
    }
}
