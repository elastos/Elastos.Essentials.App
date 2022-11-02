import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import FastAverageColor from 'fast-average-color';
import { Subscription } from 'rxjs/internal/Subscription';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { DappBrowserClient, DappBrowserService } from '../../services/dappbrowser.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

@Component({
    selector: 'page-browser',
    templateUrl: 'browser.html',
    styleUrls: ['browser.scss']
})
export class BrowserPage implements DappBrowserClient {
    @ViewChild(BrowserTitleBarComponent, { static: false }) titleBar: BrowserTitleBarComponent;

    public shot: string = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
    private backButtonSub: Subscription;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        public keyboard: Keyboard,
        private platform: Platform,
        public dappbrowserService: DappBrowserService,
        private walletNetworkUIService: WalletNetworkUIService,
        private globalIntentService: GlobalIntentService,
    ) {
    }


    ionViewWillEnter() {
        this.dappbrowserService.setClient(this);
        this.titleBar.setTitle(this.dappbrowserService.title);
        this.titleBar.setCloseMode(true);
        this.titleBar.setBrowserMode(true);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
            switch (icon.iconPath) {
                case BuiltInIcon.CLOSE:
                    void dappBrowser.close();
                    break;
                case BuiltInIcon.BACK:
                    void this.onGoBack();
                    break;
                case BuiltInIcon.NETWORK:
                    dappBrowser.hide();
                    await this.walletNetworkUIService.chooseActiveNetwork();
                    this.dappbrowserService.showWebView();
                    break;
                case BuiltInIcon.VERTICAL_MENU:
                    this.onMenu();
                    break;
            }
        });
    }

    ionViewDidEnter() {
        this.backButtonSub = this.platform.backButton.subscribeWithPriority(10000, () => {
            void this.onGoBack();
        });
        this.dappbrowserService.showWebView();
    }

    ionViewWillLeave() {
        void this.zone.run(async () => {
            this.shot = await dappBrowser.getWebViewShot();
        });

        dappBrowser.hide();

        if (this.backButtonSub) {
            this.backButtonSub.unsubscribe();
            this.backButtonSub = null;
        }
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    onLoadStart() {

    }

    onExit(mode?: string) {
        switch (mode) {
            case "goToLauncher":
                this.dappbrowserService.setClient(null);
                void this.nav.goToLauncher();
                break;
            case "reload":
                break;
            default:
                this.dappbrowserService.setClient(null);
                void this.nav.navigateBack();
        }
    }

    async onUrlChanged(url: string) {
        this.zone.run(() => {
            this.titleBar.setUrl(url);
        });

        let domain = this.dappbrowserService.getDomain(url);
        if (await this.dappbrowserService.checkScamDomain(domain)) {
            void this.zone.run(async () => {
                this.shot = await dappBrowser.getWebViewShot();
                await dappBrowser.hide();

                let ret = await this.dappbrowserService.showScamWarning(domain);
                if (ret) {
                    void dappBrowser.close();
                }
                else {
                    void dappBrowser.show();
                }
            });
        }
    }

    public onUrlInput(url: string) {
        void dappBrowser.loadUrl(url);
    }

    onGoToLauncher() {
        void dappBrowser.close("goToLauncher");
    }

    async onGoBack() {
        let canGoBack = await dappBrowser.canGoBack();
        if (canGoBack) {
            void dappBrowser.goBack();
        }
        else {
            void dappBrowser.close();
        }
    }

    onMenu() {
        void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/menu');
    }

    onCustomScheme(url: string) {
        if (url.startsWith("wc:")) {
            void this.globalIntentService.sendIntent("rawurl", { url: url });
        }
    }

    async onThemeColor?(themeColor: string) {
        if (themeColor) {
            // Detect the dapp theme main color to make the title bar text/icons dark or light colors
            const fac = new FastAverageColor();
            try {
                let r = parseInt(themeColor.slice(1, 3), 16);
                let g = parseInt(themeColor.slice(3, 5), 16);
                let b = parseInt(themeColor.slice(5, 7), 16);

                let color = await fac.prepareResult([r, g, b, 1]);

                this.zone.run(() => {
                    if (color.isDark)
                        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
                    else
                        this.titleBar.setForegroundMode(TitleBarForegroundMode.DARK);

                    // Set the title bar background color to match the dapp theme
                    this.titleBar.setBackgroundColor(themeColor);
                });
            } catch (e) {
                console.log(e);
            }
        }
    }
}
