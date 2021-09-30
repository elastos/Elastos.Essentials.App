import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BrowsedAppInfo } from '../model/browsedappinfo';
import { BrowserFavorite } from '../model/favorite';

/**
 * Manages favorite web dapps.
 */
@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    public favoritesSubject: BehaviorSubject<BrowserFavorite[]> = new BehaviorSubject(null);

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStorageService: GlobalStorageService
    ) { }

    public async init(): Promise<void> {
        await this.loadFavorites();
    }

    private async loadFavorites(): Promise<void> {
        let favorites = await this.globalStorageService.getSetting(
            GlobalDIDSessionsService.signedInDIDString,
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

        // Create the favorite
        let favorites = this.favoritesSubject.value;
        let newFavorite: BrowserFavorite = {
            name: appInfo.title,
            description: appInfo.description,
            iconUrl: appInfo.iconUrl,
            url: appInfo.url,
            networks: [] // All networks enabled by default
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
            GlobalDIDSessionsService.signedInDIDString,
            "dappbrowser", "favorites", this.favoritesSubject.value);
    }

    public findFavoriteByUrl(url: string) {
        return this.favoritesSubject.value.find(f => f.url === url);
    }
}