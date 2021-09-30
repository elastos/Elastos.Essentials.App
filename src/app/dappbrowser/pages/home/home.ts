import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { BrowserFavorite } from '../../model/favorite';
import { DappBrowserClient, DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

type DAppMenuEntry = {
    icon: string;
    title: string;
    description: string;
    url: string;
    useExternalBrowser: boolean;
}

@Component({
    selector: 'page-home',
    templateUrl: 'home.html',
    styleUrls: ['home.scss']
})
export class HomePage implements DappBrowserClient {
    @ViewChild(BrowserTitleBarComponent, { static: false }) titleBar: BrowserTitleBarComponent;

    public dApps: DAppMenuEntry[] = [];
    public favorites: BrowserFavorite[] = [];

    public dabRunning = false;
    private favoritesSubscription: Subscription = null;

    private titleBarIconClickedListener: (no: number) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStartupService: GlobalStartupService,
        private globalIntentService: GlobalIntentService,
        public dappbrowserService: DappBrowserService,
        private favoritesService: FavoritesService
    ) {
        this.initDapps();
    }

    initDapps() {
        // Only add builtin dapps for Android.
        if (this.platform.platforms().indexOf('android') >= 0) {
            this.dApps = [
                {
                    icon: '/assets/browser/dapps/feeds.png',
                    title: 'Feeds',
                    description: 'Feeds is a new, decentralized social platform where users remain in full control of the data they generate, and may also profit from it.',
                    url: 'https://feeds.trinity-feeds.app/nav/?page=home',
                    useExternalBrowser: true
                },
                {
                    icon: '/assets/browser/dapps/profile.png',
                    title: 'Profile',
                    description: 'A better way to be online using Elastos DID',
                    url: 'https://profile.site/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/glidefinance.svg',
                    title: 'Glide Finance',
                    description: 'Elastos ecosystem decentralized exchange',
                    url: 'https://glidefinance.io/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/filda.png',
                    title: 'FilDA',
                    description: 'HECO-based lending and borrowing, with ELA support',
                    url: 'https://filda.io/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/tokswap.png',
                    title: 'TokSwap',
                    description: 'Swap your tokens on the Elastos blockchain',
                    url: 'https://tokswap.net/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/tokbridge.svg',
                    title: 'Shadow Tokens',
                    description: 'Bridge assets between Elastos and other chains',
                    url: 'https://tokbridge.net/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/creda.png',
                    title: 'CreDA',
                    description: 'Turn data into wealth - Elastos DID powered DeFi dApp',
                    url: 'https://creda.app/',
                    useExternalBrowser: false
                },
                {
                    icon: '/assets/browser/dapps/cryptoname.png',
                    title: 'Cryptoname',
                    description: 'CryptoName is your passport to the crypto world',
                    url: 'https://cryptoname.org/',
                    useExternalBrowser: false
                },
            ];
        } else {
            this.dApps = [];
        }
    }

    ionViewWillEnter() {
        this.setTheme(this.theme.darkMode);

        this.favoritesSubscription = this.favoritesService.favoritesSubject.subscribe(favorites => {
            this.favorites = favorites;
        })
    }

    ionViewWillLeave() {
        this.favoritesSubscription.unsubscribe();
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

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (no) => {
            switch (no) {
                case 0:
                    void this.nav.goToLauncher();
                    break;
                case 1:
                    void this.nav.navigateBack();
                    break;
                case 2:
                    void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/menu');
                    break;
            }
        });
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
        let target = "_webview";
        // let target = "_blank";
        if (target == "_blank") {
            this.dappbrowserService.setClient(this);
            this.dabRunning = true;
        }
        void this.dappbrowserService.open(url, target, title);
        if (target == "_webview") {
            void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/browser');
        }
    }

    private openWithExternalBrowser(url: string) {
        void this.globalIntentService.sendIntent('openurl', { url: url });
    }

    public openFavoriteSettings(favorite: BrowserFavorite) {
        // TODO
    }

    onExit(mode?: string) {
        this.zone.run(() => {
            this.dabRunning = false;
        });
        if (mode) {
            void this.nav.goToLauncher();
        }
    }

    onMenu() {
        dappBrowser.hide();
        void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/menu');
    }

    /* public browserMdexTest() {
      let browser = DAppBrowser.open("https://mdex.me", this.iab, this.httpClient);
    }

    public browserFildaTest() {
      let browser = DAppBrowser.open("https://filda.io", this.iab, this.httpClient);
    }

    public browserCredaTest() {
      let browser = DAppBrowser.open("https://creda.app", this.iab, this.httpClient);
    }

    public browserElavateTest() {
      //let browser = DAppBrowser.open("https://elavate.exchange/", this.iab, this.httpClient);
      let browser = DAppBrowser.open("http://192.168.31.114:3000/", this.iab, this.httpClient);
    }

    public browserPilotTest() {
      let browser = DAppBrowser.open("https://p.td/", this.iab, this.httpClient);
    }

    public browserTokswapTest() {
      let browser = DAppBrowser.open("https://tokswap.net/", this.iab, this.httpClient);
    }

    public browserTokbridgeTest() {
      let browser = DAppBrowser.open("https://tokbridge.net/", this.iab, this.httpClient);
    }

    public browserOtherTest() {
      let browser = DAppBrowser.open("http://192.168.31.114:8101", this.iab, this.httpClient);
      //let browser = DAppBrowser.open("https://o3swap.com/vault", this.iab, this.httpClient);
    } */
}
