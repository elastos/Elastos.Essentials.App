import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { BrowsedAppInfo } from '../model/browsedappinfo';
import { BrowserFavorite } from '../model/favorite';

/**
 * Manages favorite web dapps.
 */
@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    public favoritesSubject: BehaviorSubject<BrowserFavorite[]> = new BehaviorSubject([]);

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStorageService: GlobalStorageService
    ) { }

    public init(): Promise<void> {
        // Don't block, we cant wait 1-2 secs at boot before loading this.
        // User may not add new favorites during this time
        runDelayed(() => this.loadFavorites(), 2000);
        return;
    }

    private async loadFavorites(): Promise<void> {
        let favorites = await this.globalStorageService.getSetting(
            DIDSessionsStore.signedInDIDString,
            "dappbrowser", "favorites", []);

        Logger.log("dappbrowser", "Loaded favorites:", favorites);

        this.favoritesSubject.next(favorites);
    }

    public getFavorites(): BrowserFavorite[] {
        return this.favoritesSubject.value;
    }

    public async addToFavorites(appInfo: BrowsedAppInfo): Promise<void> {
        if (!appInfo) {
            Logger.error("dappbrowser", "Can't add empty info to favorites!");
            return;
        }

        GlobalFirebaseService.instance.logEvent("browser_add_favorite");

        // Create the favorite
        let favorites = this.favoritesSubject.value;
        let newFavorite: BrowserFavorite = {
            name: appInfo.title,
            description: appInfo.description,
            iconUrl: appInfo.iconUrl,
            url: appInfo.url,
            networks: [], // All networks enabled by default
            useExternalBrowser: appInfo.useExternalBrowser
        };
        favorites.push(newFavorite);
        this.favoritesSubject.next(favorites);

        // Save to disk
        await this.saveFavoritesToDisk();

        Logger.log("dappbrowser", "Favorite was added");
    }

    public async removeFromFavorites(favorite: BrowserFavorite): Promise<void> {
        let favorites = this.favoritesSubject.value;
        favorites.splice(favorites.findIndex(f => f.url === favorite.url), 1);
        this.favoritesSubject.next(favorites);
        await this.saveFavoritesToDisk();

        Logger.log("dappbrowser", "Favorite was removed");
    }

    private async saveFavoritesToDisk(): Promise<void> {
        await this.globalStorageService.setSetting(
            DIDSessionsStore.signedInDIDString,
            "dappbrowser", "favorites", this.favoritesSubject.value);
    }

    public findFavoriteByUrl(url: string): BrowserFavorite {
        return this.favoritesSubject.value.find(f => f.url === url);
    }

    public urlInFavorites(url: string): boolean {
        return !!this.findFavoriteByUrl(url);
    }

    /**
     * Adds the given network as enabled for this favorite, meaning that the favorite will show
     * when this network is active only.
     */
    public async enableNetworkForFavorite(favorite: BrowserFavorite, network: AnyNetwork): Promise<boolean> {
        let networkIndex = favorite.networks.findIndex(n => n == network.key);
        console.log("enableNetworkForFavorite", favorite, network, networkIndex)
        if (networkIndex >= 0)
            return false; // already in the list

        favorite.networks.push(network.key);

        await this.saveFavoritesToDisk();

        return true;
    }

    /**
     * Removes the given network from the enabled networks list for this favorite.
     */
    public async disableNetworkForFavorite(favorite: BrowserFavorite, network: AnyNetwork): Promise<boolean> {
        let networkIndex = favorite.networks.findIndex(n => n == network.key);
        if (networkIndex == -1)
            return false; // not found

        favorite.networks.splice(networkIndex, 1);

        await this.saveFavoritesToDisk();

        return true;
    }
}