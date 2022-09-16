import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { urlDomain } from 'src/app/helpers/url.helpers';
import { Logger } from 'src/app/logger';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { BrowsedAppInfo } from '../model/browsedappinfo';
import { BrowserFavorite } from '../model/favorite';
import { DappBrowserService } from './dappbrowser.service';

/**
 * Manages favorite web dapps.
 */
@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    public favorites: BehaviorSubject<BrowserFavorite[]> = new BehaviorSubject(null); // Favorites in addition order
    public sortedFavorites: BehaviorSubject<BrowserFavorite[]> = new BehaviorSubject(null); // Favorites by more recently used order

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStorageService: GlobalStorageService,
        private browserService: DappBrowserService
    ) { }

    public init(): Promise<void> {
        // Don't block, we cant wait 1-2 secs at boot before loading this.
        // User may not add new favorites during this time
        runDelayed(() => this.loadFavorites(), 2000);

        this.browserService.recentApps.subscribe(recentApps => {
            // Recent apps have changed, sort our sorted favorites again.
            this.sortedFavorites.next(this.sortFavorites(this.favorites.value));
        });

        return;
    }

    private async loadFavorites(): Promise<void> {
        let favorites = await this.globalStorageService.getSetting(
            DIDSessionsStore.signedInDIDString,
            "dappbrowser", "favorites", []);

        Logger.log("dappbrowser", "Loaded favorites:", favorites);

        this.favorites.next(favorites);
        this.sortedFavorites.next(this.sortFavorites(favorites));
    }

    public getFavorites(): BrowserFavorite[] {
        return this.favorites.value;
    }

    public async addToFavorites(appInfo: BrowsedAppInfo): Promise<void> {
        if (!appInfo) {
            Logger.error("dappbrowser", "Can't add empty info to favorites!");
            return;
        }

        // Create the favorite
        let favorites = this.favorites.value;
        let newFavorite: BrowserFavorite = {
            name: appInfo.title,
            description: appInfo.description,
            iconUrl: appInfo.iconUrl,
            url: appInfo.url,
            networks: [], // All networks enabled by default
            useExternalBrowser: appInfo.useExternalBrowser
        };
        favorites.push(newFavorite);
        this.favorites.next(favorites);
        this.sortedFavorites.next(this.sortFavorites(favorites));

        // Save to disk
        await this.saveFavoritesToDisk();

        Logger.log("dappbrowser", "Favorite was added");
    }

    public async removeFromFavorites(favorite: BrowserFavorite): Promise<void> {
        let favorites = this.favorites.value;
        favorites.splice(favorites.findIndex(f => f.url === favorite.url), 1);
        this.favorites.next(favorites);
        this.sortedFavorites.next(this.sortFavorites(favorites));
        await this.saveFavoritesToDisk();

        Logger.log("dappbrowser", "Favorite was removed");
    }

    private sortFavorites(favorites: BrowserFavorite[]): BrowserFavorite[] {
        if (!favorites)
            return [];

        // Copy the favorites
        let sortedFavorites: BrowserFavorite[] = Array.from(favorites);

        // Build a sorted list of recent app's (url domain only)
        let recentApps = this.browserService.recentApps.value.map(recentApp => urlDomain(recentApp));

        // Sort favorites according to their last use, to make sure recent favorites appear first
        sortedFavorites.sort((a, b) => {
            let aRecentAppIndex = recentApps.findIndex(recentApp => urlDomain(a.url) === recentApp);
            let bRecentAppIndex = recentApps.findIndex(recentApp => urlDomain(b.url) === recentApp);

            return aRecentAppIndex - bRecentAppIndex;
        });

        return sortedFavorites;
    }

    private async saveFavoritesToDisk(): Promise<void> {
        await this.globalStorageService.setSetting(
            DIDSessionsStore.signedInDIDString,
            "dappbrowser", "favorites", this.favorites.value);
    }

    public findFavoriteByUrl(url: string): BrowserFavorite {
        return this.favorites.value.find(f => f.url === url);
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