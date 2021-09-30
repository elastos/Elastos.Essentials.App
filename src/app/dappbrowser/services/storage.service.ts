import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BrowsedAppInfo } from '../model/browsedappinfo';

/**
 * Stores various information about browsed apps
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private globalStorageService: GlobalStorageService
    ) { }

    public async init(): Promise<void> {
    }

    /**
     * Saves information about a browsed dapp for later use (for example when adding to favorites)
     */
    public async saveBrowsedAppInfo(url: string, title: string, description: string, iconUrl: string): Promise<BrowsedAppInfo> {
        // TODO: also save a local base64 copy of the icon ?

        let appInfo: BrowsedAppInfo = {
            url, title, description, iconUrl
        };
        let key = "appinfo-" + url; // Use the url as access key
        await this.globalStorageService.setSetting(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", key, appInfo);

        return appInfo;
    }

    public async getBrowsedAppInfo(url: string): Promise<BrowsedAppInfo> {
        let key = "appinfo-" + url; // Use the url as access key
        let appInfo = await this.globalStorageService.getSetting(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", key, null);
        return appInfo;
    }
}