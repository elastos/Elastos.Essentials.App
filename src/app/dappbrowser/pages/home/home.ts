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
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { BrowserFavorite } from '../../model/favorite';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

type DAppMenuEntry = {
    icon: string;
    title: string;
    description: string;
    url: string;
    useExternalBrowser: boolean;
    walletConnectSupported: boolean; // Whether the dapp supports wallet connect or not (needed for external navigation on ios for instance - otherwise we don't recommend)
    networks: string[]; // List of network keys in which this dapp can run. Empty list = available everywhere.
}

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
        private globalStartupService: GlobalStartupService,
        private globalIntentService: GlobalIntentService,
        private globalStorageService: GlobalStorageService,
        public dappbrowserService: DappBrowserService,
        public walletNetworkService: WalletNetworkService,
        private walletNetworkUIService: WalletNetworkUIService,
        private favoritesService: FavoritesService
    ) {
        void this.init();
    }

    private async init() {
        this.isIOS = this.platform.platforms().indexOf('android') < 0;
        this.canBrowseInApp = await this.dappbrowserService.canBrowseInApp();

        this.allDApps = [
            {
                icon: '/assets/browser/dapps/feeds.png',
                title: 'Feeds',
                description: 'Feeds is a decentralized social platform where users remain in full control of their data.',
                url: 'https://feeds.trinity-feeds.app/nav/?page=home',
                useExternalBrowser: true,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/glidefinance.png',
                title: 'Glide Finance',
                description: 'Elastos ecosystem decentralized exchange',
                url: 'https://glidefinance.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/elacity.png',
                title: 'Elacity',
                description: 'A community driven online marketplace',
                url: 'https://ela.city/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/pasar.png',
                title: 'Pasar Protocol',
                description: 'Web3.0 Decentralized Marketplace (DeMKT) and Data Exchange',
                url: 'https://pasarprotocol.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/meteast.png',
                title: 'MetEast',
                description: 'Decentralized NFT marketplace on Elastos ESC, with better liquidity, autonomous governance and friendly interactions.',
                url: 'https://meteast.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/elab.png',
                title: 'E-Lab',
                description: 'Cyber Republic community-driven grant program that supports developers wanting to build using Elastos Web3 technology',
                url: 'https://e-lab.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/kycme.png',
                title: 'KYC-me',
                description: 'Get DID credentials from your real identity here, to get access to more dApps such as ELAB.',
                url: 'https://kyc-me.io?theme=' + (this.theme.darkMode ? "dark" : "light"),
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/cyberrepublic.svg',
                title: 'Cyber Republic',
                description: 'Cyber Republic (CR) is the community that has naturally formed around Elastos.',
                url: 'https://www.cyberrepublic.org/',
                useExternalBrowser: false,
                walletConnectSupported: true, // Not really, but we can open on ios, as this is a non web3 dapps
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/anyswap.svg',
                title: 'AnySwap',
                description: 'Anyswap is a fully decentralized cross chain swap protocol, based on Fusion DCRM technology, with automated pricing and liquidity system.',
                url: 'https://anyswap.exchange/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["arbitrum", "avalanchecchain", "bsc", "eth", "heco", "fusion", "fantom", "polygon", "telos"]
            },
            {
                icon: '/assets/browser/dapps/creda.png',
                title: 'CreDA',
                description: "The world's first trusted decentralized credit rating service to create a universal trust score for Web 3.0.",
                url: 'https://creda.app/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["arbitrum", "elastossmartchain", "bsc", "ethereum"]
            },
            {
                icon: '/assets/browser/dapps/elk.svg',
                title: 'ElkDex by ElkFinance',
                description: 'Elk Finance is a decentralized network for cross-chain liquidity. Our motto is "Any chain, anytime, anywhere.™',
                url: 'https://app.elk.finance/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["elastossmartchain", "heco", "bsc", "avalanchecchain", "fantom", "polygon", "telos"]
            },
            {
                icon: '/assets/browser/dapps/vitrim.png',
                title: 'Vitrim Ecosystem',
                description: 'Discover the latest #VitrimNFTs on the largest NFT marketplace on Elastos. NFTs + DEFI',
                url: 'https://vitrim.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/filda.png',
                title: 'FilDA',
                description: 'Multi-assets lending and borrowing DeFi platform',
                url: 'https://app.filda.io/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["heco", "bsc", "elastossmartchain"]
            },
            {
                icon: '/assets/browser/dapps/idriss.png',
                title: 'IDriss',
                description: 'Link wallet addresses from multiple networks to emails, phone numbers or @Twitter usernames, enabling quick lookup and payments (registry on Polygon).',
                url: 'https://www.idriss.xyz/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["elastossmartchain", "polygon"]
            },
            /* {
                icon: '/assets/browser/dapps/profile.png',
                title: 'Profile',
                description: 'A better way to be online using Elastos DID',
                url: 'https://profile.site/',
                useExternalBrowser: false,
                networks: ["elastossmartchain"]
            }, */
            {
                icon: '/assets/browser/dapps/mdex.png',
                title: 'Mdex',
                description: 'An AMM-based decentralized transaction protocol that integrates DEX, IMO & DAO',
                url: 'https://ht.mdex.co/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["heco"]
            },
            {
                icon: '/assets/browser/dapps/mdex.png',
                title: 'Mdex',
                description: 'An AMM-based decentralized transaction protocol that integrates DEX, IMO & DAO',
                url: 'https://bsc.mdex.co/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["bsc"]
            },
            // {
            //     icon: '/assets/browser/dapps/rocketx.png',
            //     title: 'RocketX - Skyscanner Crypto',
            //     description: ' RocketX aggregates Centralised and Decentralised Crypto Exchanges and makes it really simple to trade ANY token listed on ANY exchange. Best rates with minimal slippage.',
            //     url: 'https://staging.rocketx.exchange/',
            //     useExternalBrowser: false,
            //     walletConnectSupported: false,
            //     networks: ["avalanchecchain", "bsc", "ethereum", "polygon"]
            // },
            {
                icon: '/assets/browser/dapps/raven.png',
                title: 'Moe Raven',
                description: 'The magical matic yield optimizer',
                url: 'https://raven.moe/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["elastossmartchain", "polygon"]
            },
            {
                icon: '/assets/browser/dapps/tokbridge.svg',
                title: 'Shadow Tokens',
                description: 'Bridge assets between Elastos and other chains',
                url: 'https://tokbridge.net/',
                useExternalBrowser: false,
                walletConnectSupported: false, // Seems to be supported on the website but not working
                networks: ["elastossmartchain", "heco", "bsc", "ethereum"]
            },
            {
                icon: '/assets/browser/dapps/tokswap.png',
                title: 'TokSwap',
                description: 'Swap your tokens on the Elastos blockchain',
                url: 'https://tokswap.net/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["elastossmartchain"]
            },
            /* {
                icon: '/assets/browser/dapps/tin.jpg',
                title: 'Tin.network',
                description: 'Manage your DeFi assets and liabilities in one simple interface',
                url: 'https://tin.network/',
                useExternalBrowser: false,
                walletConnectSupported: true, // Not really, but not needed
                networks: []
            }, */
            /* {
                icon: '/assets/browser/dapps/cryptoname.png',
                title: 'Cryptoname',
                description: 'CryptoName is your passport to the crypto world',
                url: 'https://cryptoname.org/',
                useExternalBrowser: false,
                walletConnectSupported: false,
                networks: ["elastossmartchain"]
            }, */
            {
                icon: '/assets/browser/dapps/sushiswap.png',
                title: 'Sushiswap',
                description: 'Be a DeFi Chef with Sushi. Swap, earn, stack yields, lend, borrow ...',
                url: 'https://app.sushi.com/',
                useExternalBrowser: false,
                walletConnectSupported: true,
                networks: ["ethereum", "fantom", "bsc", "polygon", "telos"]
            },
        ];

        void this.updateFavoritesAndApps();
    }

    async ionViewWillEnter() {
        this.setTheme(this.theme.darkMode);
        this.titleBar.setBrowserMode(false);
        this.titleBar.setCloseMode(false);

        await this.checkNoInAppNoticeStatus();

        this.favoritesSubscription = this.favoritesService.favoritesSubject.subscribe(favorites => {
            if (favorites) {
                void this.updateFavoritesAndApps();
            }
        });

        this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(network => {
            if (network) {
                void this.updateFavoritesAndApps();
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.recentAppsSubscription = this.dappbrowserService.recentApps.subscribe(async recentApps => {
            this.recentApps = await this.dappbrowserService.getRecentAppsWithInfo();
            console.log("recent apps", this.recentApps);
        });
    }

    ionViewWillLeave() {
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
        if (this.favoritesService.favoritesSubject.value && this.walletNetworkService.activeNetwork.value) {
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
        this.globalStartupService.setStartupScreenReady();

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
        const canBrowseInApp = await this.dappbrowserService.canBrowseInApp();
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

    public onUrlInput(url: string) {
        // this.keyboard.hide();
        void this.dabOpen(url);
    }

    private dabOpen(url: string, title?: string) {
        // '_blank' mode
        // let target = "_blank";
        // if (target == "_blank") {
        //     this.dappbrowserService.setClient(this);
        //     this.dabRunning = true;
        // }
        void this.dappbrowserService.openForBrowseMode(url, title);
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
        void this.dappbrowserService.saveBrowsedAppInfo(appInfo)
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
        void this.dappbrowserService.saveBrowsedAppInfo(appInfo)
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
        void this.dappbrowserService.openRecentApp(recentApp);
    }

    public getShortFavoriteDescription(favorite: BrowserFavorite): string {
        if (!favorite.description)
            return "";

        const limit = 50;
        if (favorite.description.length < limit)
            return favorite.description;
        else
            return favorite.description.substring(0, limit) + "...";
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
        this.noInAppNoticeDismissed = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, "dappbrowser", "noinappnoticedismissed", false);
    }

    public dismissNoInAppNotice() {
        this.noInAppNoticeDismissed = true;
        this.noInAppNoticeDismissed = void this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, "dappbrowser", "noinappnoticedismissed", true);
    }

    public getRecentApps(): BrowsedAppInfo[] {
        return this.recentApps.slice(0, Math.min(3, this.recentApps.length));
    }
}
