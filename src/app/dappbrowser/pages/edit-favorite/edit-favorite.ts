import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { BrowserFavorite } from '../../model/favorite';
import { FavoritesService } from '../../services/favorites.service';

@Component({
    selector: 'page-edit-favorite',
    templateUrl: 'edit-favorite.html',
    styleUrls: ['edit-favorite.scss']
})
export class EditFavoritePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public favorite: BrowserFavorite = null;
    public availableNetworks: Network[] = [];
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private router: Router,
        private favoritesService: FavoritesService,
        private walletNetworksService: WalletNetworkService
    ) {
    }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            let favoriteUrl = navigation.extras.state.favoriteUrl;
            this.favorite = this.favoritesService.findFavoriteByUrl(favoriteUrl);
        }
    }

    // onExit(data: IABExitData) {
    //     throw new Error('Method not implemented.');
    // }

    ionViewWillEnter() {
        this.titleBar.setTitle("Edit favorite");
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            void this.goback();
        });
    }

    ionViewDidEnter() {
        this.availableNetworks = this.walletNetworksService.getAvailableNetworks();
    }

    async goback() {
        await this.nav.navigateBack();
    }

    public isInFavorites(): boolean {
        return true;
    }

    public async removeFavorite() {
        // Remove from favorites
        await this.favoritesService.removeFromFavorites(this.favorite);

        // Exit screen (go back to home)
        void this.nav.navigateBack();
    }

    onNetworkToggled(event: { detail: { checked: boolean } }, network: Network) {
        if (event.detail.checked)
            this.enableNetworkForFavorite(this.favorite, network);
        else
            this.disableNetworkForFavorite(this.favorite, network);
    }

    public isNetworkEnabled(network: Network): boolean {
        return this.favorite.networks.findIndex(n => n === network.key) >= 0;
    }

    public enableNetworkForFavorite(favorite: BrowserFavorite, network: Network) {
        void this.favoritesService.enableNetworkForFavorite(favorite, network);
    }

    public disableNetworkForFavorite(favorite: BrowserFavorite, network: Network) {
        void this.favoritesService.disableNetworkForFavorite(favorite, network);
    }
}
