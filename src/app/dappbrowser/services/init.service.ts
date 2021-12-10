import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { FavoritesService } from './favorites.service';

/**
 * Manages favorite web dapps.
 */
@Injectable({
    providedIn: 'root'
})
export class DAppBrowserInitService extends GlobalService {
    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private favoritesService: FavoritesService
    ) {
        super();
    }

    public init() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.favoritesService.init();
    }

    onUserSignOut(): Promise<void> {
        return;
    }
}