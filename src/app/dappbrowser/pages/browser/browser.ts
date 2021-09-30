import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
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

    private titleBarIconClickedListener: (no: number) => void;
    private backButtonSub: Subscription;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        public keyboard: Keyboard,
        private platform: Platform,
        public dappbrowserService: DappBrowserService,
        private storageService: StorageService
    ) {
    }

    ionViewWillEnter() {
        this.dappbrowserService.setClient(this);
        this.titleBar.setTitle(this.dappbrowserService.title);

        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (no) => {
            switch (no) {
                case 0:
                    this.onGoToLauncher();
                    break;
                case 1:
                    void this.onGoBack();
                    break;
                case 2:
                    this.onMenu();
                    break;
            }
        });
    }

    ionViewDidEnter() {
        this.backButtonSub = this.platform.backButton.subscribeWithPriority(10000, () => {
            this.onGoBack();
        });
        dappBrowser.show();
    }

    ionViewWillLeave() {
        this.backButtonSub.unsubscribe();
    }

    onExit(mode?: string) {
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

    keyEnter() {
        // if (this.url && this.url !== "") {
        //     let fixedUrl: string = this.url.toLowerCase();
        //     if (!fixedUrl.startsWith("http"))
        //         fixedUrl = "https://" + fixedUrl;

        //     this.keyboard.hide();
        //     dappBrowser.loadUrl(fixedUrl);
        // }
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
        void this.zone.run(async () => {
            // this.shot = await dappBrowser.getWebViewShot();
            // this.shot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
        });

        dappBrowser.hide();
        void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/menu');
    }
    /*
        onLoadStop(info: DABLoadStop) {
        }
     */
    getIconPath(no: number) {
        // Replace built-in icon path placeholders with real picture path
        switch (no) {
            case 0:
                return this.theme.darkMode ? 'assets/components/titlebar/darkmode/elastos.svg' : 'assets/components/titlebar/elastos.svg';
            case 1:
                return this.theme.darkMode ? 'assets/components/titlebar/darkmode/back.svg' : 'assets/components/titlebar/back.svg';
            case 2:
                return this.theme.darkMode ? 'assets/components/titlebar/darkmode/vertical_menu.svg' : 'assets/components/titlebar/vertical_menu.svg';
        }
    }
}
