import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { BrowserFavorite } from '../../model/favorite';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

type DAppMenuEntry = {
    icon: string;
    title: string;
    description: string;
    url: string;
    useExternalBrowser: boolean;
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

    public dabRunning = false;
    private favoritesSubscription: Subscription = null;
    private networkSubscription: Subscription = null;

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
        public dappbrowserService: DappBrowserService,
        public walletNetworkService: WalletNetworkService,
        private walletNetworkUIService: WalletNetworkUIService,
        private favoritesService: FavoritesService
    ) {
        this.initDapps();
    }

    initDapps() {
        // Only add builtin dapps for Android.
        if (this.platform.platforms().indexOf('android') >= 0) {
            this.allDApps = [
                {
                    icon: '/assets/browser/dapps/feeds.png',
                    title: 'Feeds',
                    description: 'Feeds is a decentralized social platform where users remain in full control of their data.',
                    url: 'https://feeds.trinity-feeds.app/nav/?page=home',
                    useExternalBrowser: true,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/cyberrepublic.svg',
                    title: 'Cyber Republic',
                    description: 'Cyber Republic (CR) is the community that has naturally formed around Elastos.',
                    url: 'https://www.cyberrepublic.org/',
                    useExternalBrowser: false,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/glidefinance.png',
                    title: 'Glide Finance',
                    description: 'Elastos ecosystem decentralized exchange',
                    url: 'https://glidefinance.io/',
                    useExternalBrowser: false,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/profile.png',
                    title: 'Profile',
                    description: 'A better way to be online using Elastos DID',
                    url: 'https://profile.site/',
                    useExternalBrowser: false,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/filda.png',
                    title: 'FilDA',
                    description: 'HECO-based lending and borrowing, with ELA support',
                    url: 'https://filda.io/',
                    useExternalBrowser: false,
                    networks: ["heco", "bsc"]
                },
                {
                    icon: '/assets/browser/dapps/tokswap.png',
                    title: 'TokSwap',
                    description: 'Swap your tokens on the Elastos blockchain',
                    url: 'https://tokswap.net/',
                    useExternalBrowser: false,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/tokbridge.svg',
                    title: 'Shadow Tokens',
                    description: 'Bridge assets between Elastos and other chains',
                    url: 'https://tokbridge.net/',
                    useExternalBrowser: false,
                    networks: ["elastos", "heco", "bsc", "ethereum"]
                },
                {
                    icon: '/assets/browser/dapps/creda.png',
                    title: 'CreDA',
                    description: 'Turn data into wealth - Elastos DID powered DeFi dApp',
                    url: 'https://creda.app/',
                    useExternalBrowser: false,
                    networks: ["arbitrum"]
                },
                {
                    icon: '/assets/browser/dapps/cryptoname.png',
                    title: 'Cryptoname',
                    description: 'CryptoName is your passport to the crypto world',
                    url: 'https://cryptoname.org/',
                    useExternalBrowser: false,
                    networks: ["elastos"]
                },
                {
                    icon: '/assets/browser/dapps/elk.svg',
                    title: 'ElkDex by ElkFinance',
                    description: 'Elk Finance is a decentralized network for cross-chain liquidity. The Elk ecosystem introduces a seamless process for anyone exchanging cryptocurrencies. Our motto is Any chain, anytime, anywhere.™',
                    url: 'https://app.elk.finance/',
                    useExternalBrowser: false,
                    networks: ["elastos", "heco", "bsc", "avalanchecchain", "fantom", "polygon"]
                },
            ];
        } else {
            this.allDApps = [];
        }

        this.buildFilteredDApps();
    }

    ionViewWillEnter() {
        this.setTheme(this.theme.darkMode);
        this.titleBar.setBrowserMode(false);
        this.titleBar.setCloseMode(false);

        this.favoritesSubscription = this.favoritesService.favoritesSubject.subscribe(favorites => {
            this.buildFilteredFavorites();
            this.buildFilteredDApps();
            this.buildFilteredDAppsWithFavorites();
        });

        this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(network => {
            this.buildFilteredFavorites();
            this.buildFilteredDApps();
            this.buildFilteredDAppsWithFavorites();
        });
    }

    ionViewWillLeave() {
        this.favoritesSubscription.unsubscribe();
        this.networkSubscription.unsubscribe();
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
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
        //On _blank mode, after hide for menu.
        void dappBrowser.show();

        this.globalStartupService.setStartupScreenReady();

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            switch (icon.iconPath) {
                case BuiltInIcon.ELASTOS:
                    void this.nav.goToLauncher();
                    break;
                case BuiltInIcon.BACK:
                    void this.nav.navigateBack();
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
        this.favorites = this.favoritesService.getFavorites().filter(f => {
            return f.networks.length == 0 || f.networks.indexOf(this.walletNetworkService.activeNetwork.value.key) >= 0;
        });
    }

    private buildFilteredDApps() {
        this.dApps = this.allDApps.filter(a => {
            return a.networks.length == 0 || a.networks.indexOf(this.walletNetworkService.activeNetwork.value.key) >= 0;
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
            this.openWithExternalBrowser(app.url);
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
        void this.dappbrowserService.open(url, title);
    }

    private openWithExternalBrowser(url: string) {
        void this.globalIntentService.sendIntent('openurl', { url: url });
    }

    public openFavorite(favorite: BrowserFavorite) {
        void this.dabOpen(favorite.url, favorite.name);
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

    onMenu() {
        dappBrowser.hide();
        void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/menu');
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
}
