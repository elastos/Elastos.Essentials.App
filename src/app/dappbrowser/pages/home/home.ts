import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { BrowserFavorite } from '../../model/favorite';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';
import { DAppMenuEntry, suggestedDApps } from './suggestedapps';

@Component({
    selector: 'page-home',
    templateUrl: 'home.html',
    styleUrls: ['home.scss']
})
export class HomePage { //implements DappBrowserClient // '_blank' mode {
    @ViewChild(BrowserTitleBarComponent, { static: false }) titleBar: BrowserTitleBarComponent;

    public dApps: DAppMenuEntry[] = [];
    public allDApps: DAppMenuEntry[] = [];
    public favorites: BrowserFavorite[] = [];
    public recentApps: BrowsedAppInfo[] = [];

    public dabRunning = false;
    public noInAppNoticeDismissed = true; // Whether user has previously dismissed the "ios / no in app browser" box or not.
    public canBrowseInApp = false;
    public isIOS = false;

    private inputStatusSub: Subscription;
    private restoreWebviewTimeout;
    public shouldShowAssistant = false;
    public urlInputAssistantFilter = "";

    private favoritesSubscription: Subscription = null;
    private networkSubscription: Subscription = null;
    private recentAppsSubscription: Subscription = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalIntentService: GlobalIntentService,
        private globalStorageService: GlobalStorageService,
        private dAppBrowserService: DappBrowserService,
        public walletNetworkService: WalletNetworkService,
        private walletNetworkUIService: WalletNetworkUIService,
        private favoritesService: FavoritesService
    ) {
        void this.init();
    }

    private async init() {
        this.isIOS = this.platform.platforms().indexOf('android') < 0;
        this.canBrowseInApp = await this.dAppBrowserService.canBrowseInApp();

        if (!this.isIOS)
            this.allDApps = suggestedDApps(this.theme.darkMode);

        void this.updateFavoritesAndApps();
    }

    async ionViewWillEnter() {
        this.setTheme(this.theme.darkMode);
        this.titleBar.setBrowserMode(false);
        this.titleBar.setCloseMode(false);

        await this.checkNoInAppNoticeStatus();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.favoritesSubscription = this.favoritesService.favorites.subscribe(async favorites => {
            if (favorites) {
                await this.updateFavoritesAndApps();
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(async network => {
            if (network) {
                await this.updateFavoritesAndApps();
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.recentAppsSubscription = this.dAppBrowserService.recentApps.subscribe(async recentApps => {
            this.recentApps = await this.dAppBrowserService.getRecentAppsWithInfo();
            //console.log("recent apps", this.recentApps);
        });

        this.inputStatusSub = this.titleBar.inputStatus.subscribe(editing => {
            if (editing) {
                this.dAppBrowserService.hideActiveBrowser();
                this.shouldShowAssistant = true;
            }
            else {
                // Give some time to the url assistant to catch and send the click on a url to us, before remove the component from UI
                this.restoreWebviewTimeout = setTimeout(() => {
                    this.shouldShowAssistant = false;
                    this.dAppBrowserService.showWebView();
                }, 500);
            }
        });
    }

    ionViewWillLeave() {
        clearTimeout(this.restoreWebviewTimeout);
        this.shouldShowAssistant = false;

        this.inputStatusSub.unsubscribe();

        if (this.favoritesSubscription) {
            this.favoritesSubscription.unsubscribe();
            this.favoritesSubscription = null;
        }
        if (this.networkSubscription) {
            this.networkSubscription.unsubscribe();
            this.networkSubscription = null;
        }
        if (this.recentAppsSubscription) {
            this.recentAppsSubscription.unsubscribe();
            this.recentAppsSubscription = null;
        }
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    private async updateFavoritesAndApps() {
        // Build dapps and favorites only when the active network and favorites are ininialized.
        if (this.favoritesService.favorites.value && this.walletNetworkService.activeNetwork.value) {
            this.buildFilteredFavorites();
            await this.buildFilteredDApps();
            this.buildFilteredDAppsWithFavorites();
        }
    }

    public setTheme(darkMode: boolean) {
        if (darkMode) {
            document.body.classList.add("dark");
        }
        else {
            document.body.classList.remove("dark");
        }
    }

    ionViewDidEnter() {
        GlobalStartupService.instance.setStartupScreenReady();

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            switch (icon.iconPath) {
                case BuiltInIcon.ELASTOS:
                    void this.nav.goToLauncher();
                    break;
                case BuiltInIcon.BACK:
                    if (this.nav.canGoBack()) {
                        void this.nav.navigateBack();
                    }
                    else {
                        // If the startup screen is DAPP browser, We go to launcher when the user clicks the back key.
                        void this.nav.navigateHome();
                    }

                    break;
            }
        });
    }

    /**
     * Rebuilds a local list of displayable favorites, based on the whole favorites list, but only
     * with favorites displayable for the active network. Meaning: favorites for which the current network
     * was manually enabled, or favorites that don't have any network enabled at all (means "show all").
     */
    private buildFilteredFavorites() {
        let allFavorites = this.favoritesService.getFavorites();
        if (allFavorites) {
            this.favorites = allFavorites.filter(f => {
                return f.networks.length == 0 || f.networks.indexOf(this.walletNetworkService.activeNetwork.value.key) >= 0;
            });
        }
    }

    private async buildFilteredDApps() {
        const canBrowseInApp = await this.dAppBrowserService.canBrowseInApp();
        this.dApps = this.allDApps.filter(app => {
            // If we need to run apps externally, but WC is not connected by apps, we don't show them.
            if (!canBrowseInApp && !app.walletConnectSupported)
                return false;

            // Show active network only
            return app.networks.length == 0 || app.networks.indexOf(this.walletNetworkService.activeNetwork.value.key) >= 0;
        });
    }

    private buildFilteredDAppsWithFavorites() {
        this.dApps = this.dApps.filter(a => {
            let urlA = this.getUrlDomain(a.url);
            return this.favorites.filter(favorite => {
                let urlB = this.getUrlDomain(favorite.url)
                return this.isSameUrl(urlA, urlB);
            }).length === 0
        });
    }

    private getUrlDomain(url: string) {
        if (!url) return '';

        let newUrl = url.toLowerCase();
        let index = newUrl.indexOf('://');
        if (index > 0) {
            newUrl = newUrl.substring(index + 3);
        }

        if (newUrl.startsWith('www.')) {
            newUrl = newUrl.substring(4);
        }
        return newUrl;
    }

    private isSameUrl(urlA: string, urlB: string) {
        if ((urlA.length === 0 || urlB.length === 0) && (urlA.length != urlB.length)) return false;

        let urlIsSame = false;
        if (urlA.length >= urlB.length) {
            if (urlA.startsWith(urlB)) {
                urlIsSame = true;
            }
        } else {
            if (urlB.startsWith(urlA)) {
                urlIsSame = true;
            }
        }
        return urlIsSame;
    }

    public onDAppClicked(app: DAppMenuEntry) {
        if (app.useExternalBrowser) {
            this.openWithExternalBrowser(app);
        } else {
            void this.dabOpen(app.url, app.title);
        }
    }

    // URL being typed, not yet confirmed
    onUrlTyped(urlOrKeywords: string) {
        this.urlInputAssistantFilter = urlOrKeywords;
    }

    public onUrlInput(url: string) {
        // this.keyboard.hide();
        void this.dabOpen(url);
    }

    public onRecentAppPicked(url: string) {
        void this.dabOpen(url);
    }

    private dabOpen(url: string, title?: string) {
        // '_blank' mode
        // let target = "_blank";
        // if (target == "_blank") {
        //     this.dappbrowserService.setClient(this);
        //     this.dabRunning = true;
        // }
        void this.dAppBrowserService.openForBrowseMode(url, title);
    }

    private openWithExternalBrowser(app: DAppMenuEntry) {
        void this.globalIntentService.sendIntent('openurl', { url: app.url });
        // Save app info and add to recent app list.
        let appInfo: BrowsedAppInfo = {
            url: app.url,
            title: app.title,
            description: app.description,
            iconUrl: app.icon,
            network: this.walletNetworkService.activeNetwork.value.key,
            lastBrowsed: moment().unix(),
            useExternalBrowser: app.useExternalBrowser
        }
        void this.dAppBrowserService.saveBrowsedAppInfo(appInfo)
    }

    private openFavoriteWithExternalBrowser(favorite: BrowserFavorite) {
        void this.globalIntentService.sendIntent('openurl', { url: favorite.url });
        // Save app info and add to recent app list.
        let appInfo: BrowsedAppInfo = {
            url: favorite.url,
            title: favorite.name,
            description: favorite.description,
            iconUrl: favorite.iconUrl,
            network: this.walletNetworkService.activeNetwork.value.key,
            lastBrowsed: moment().unix(),
            useExternalBrowser: favorite.useExternalBrowser
        }
        void this.dAppBrowserService.saveBrowsedAppInfo(appInfo)
    }

    public openFavorite(favorite: BrowserFavorite) {
        if (favorite.useExternalBrowser) {
            void this.openFavoriteWithExternalBrowser(favorite);
        } else {
            void this.dabOpen(favorite.url, favorite.name);
        }
    }

    public openFavoriteSettings(event, favorite: BrowserFavorite) {
        event.preventDefault();
        event.stopPropagation();

        void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/edit-favorite', {
            state: {
                favoriteUrl: favorite.url
            }
        });
    }

    public openRecent(recentApp: BrowsedAppInfo) {
        void this.dAppBrowserService.openRecentApp(recentApp);
    }

    public getRecentAppOrFavoriteDescription(recentAppOrFavorite: BrowsedAppInfo | BrowserFavorite): string {
        if (!recentAppOrFavorite.description)
            return "";

        const limit = 50;
        if (recentAppOrFavorite.description.length < limit)
            return recentAppOrFavorite.description;
        else
            return recentAppOrFavorite.description.substring(0, limit) + "...";
    }

    public pickNetwork() {
        void this.walletNetworkUIService.chooseActiveNetwork();
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

    public recentAppIsInFavorites(recentApp: BrowsedAppInfo): boolean {
        return this.favoritesService.urlInFavorites(recentApp.url);
    }

    /**
     * Adds or removes a favorite based on a recent app info.
     */
    public async toggleRecentAppFavorite(event, recentApp: BrowsedAppInfo) {
        event.preventDefault();
        event.stopPropagation();

        let favorite = this.favoritesService.findFavoriteByUrl(recentApp.url);
        if (favorite)
            await this.favoritesService.removeFromFavorites(favorite);
        else
            await this.favoritesService.addToFavorites(recentApp);
    }

    private async checkNoInAppNoticeStatus(): Promise<void> {
        this.noInAppNoticeDismissed = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", "noinappnoticedismissed", false);
    }

    public dismissNoInAppNotice() {
        this.noInAppNoticeDismissed = true;
        this.noInAppNoticeDismissed = void this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", "noinappnoticedismissed", true);
    }

    public getRecentApps(): BrowsedAppInfo[] {
        return this.recentApps.slice(0, Math.min(3, this.recentApps.length));
    }
}
