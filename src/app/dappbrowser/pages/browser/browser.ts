import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { BrowserTitleBarComponent } from '../../components/titlebar/titlebar.component';
import { DappBrowserClient, DappBrowserService } from '../../services/dappbrowser.service';
import { StorageService } from '../../services/storage.service';

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
        private storageService: StorageService,
        private walletNetworkUIService: WalletNetworkUIService
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
                    void dappBrowser.show();
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
        void dappBrowser.show();
    }

    ionViewWillLeave() {
        void this.zone.run(async () => {
            this.shot = await dappBrowser.getWebViewShot();
        });

        dappBrowser.hide();

        this.backButtonSub.unsubscribe();
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    onLoadStart() {

    }

    onExit(mode?: string) {
        this.dappbrowserService.setClient(null);
        if (mode) {
            void this.nav.goToLauncher();
        }
        else {
            void this.nav.navigateBack();
        }
    }

    onUrlChanged(url: string) {
        this.zone.run(() => {
            this.titleBar.setUrl(url);
        });
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
}
