import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Platform } from '@ionic/angular';
import { urlDomain } from 'src/app/helpers/url.helpers';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { DAppMenuEntry, suggestedDApps } from '../../pages/home/suggestedapps';
import { DappBrowserService } from '../../services/dappbrowser.service';

@Component({
    selector: 'url-input-assistant',
    templateUrl: './url-input-assistant.component.html',
    styleUrls: ['./url-input-assistant.component.scss'],
})
export class URLInputAssistantComponent {
    private rawRecentApps: BrowsedAppInfo[] = [];
    public recentApps: BrowsedAppInfo[] = [];
    public recentAndBuiltinApps: BrowsedAppInfo[] = [];
    public dApps: DAppMenuEntry[] = [];
    public dAppsWithAppInfo: BrowsedAppInfo[] = [];
    public allDApps: DAppMenuEntry[] = [];

    public isIOS = false;

    private _filter = "";
    @Input()
    set filter(filter: string) {
        this._filter = filter;
        void this.prepareRecentApps();
    }

    @Output()
    public urlPicked = new EventEmitter<string>();

    constructor(
        public themeService: GlobalThemeService,
        private dAppBrowserService: DappBrowserService,
        private walletNetworkService: WalletNetworkService,
        private platform: Platform,
    ) {
        void this.init();
    }

    async init() {
      this.isIOS = this.platform.platforms().indexOf('android') < 0;
      if (!this.isIOS)
          this.allDApps = suggestedDApps(this.themeService.darkMode);

      await this.buildFilteredDApps();
      this.dAppsWithAppInfo = this.getAllDAppsWithInfo();

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.dAppBrowserService.recentApps.subscribe(async recentApps => {
          this.rawRecentApps = await this.dAppBrowserService.getRecentAppsWithInfo();
          this.recentAndBuiltinApps = this.rawRecentApps.slice();
          this.dAppsWithAppInfo.forEach(app => {
              let rootDomain = urlDomain(app.url);
              if (this.rawRecentApps.findIndex(a => urlDomain(a.url) === rootDomain) == -1) {
                  this.recentAndBuiltinApps.push(app);
              }
          })

          void this.prepareRecentApps();
      });
    }

    private prepareRecentApps() {
        if (!this._filter)
            return this.recentApps = this.rawRecentApps; // No filter; return everything

        // Query from recent apps and builtin apps.
        this.recentApps = this.recentAndBuiltinApps.filter(ra => {
            return (
                ra.title && ra.title.includes(this._filter) ||
                ra.description && ra.description.includes(this._filter) ||
                ra.url && ra.url.includes(this._filter)
            );
        });

        // Don't keep too many results
        this.recentApps = this.recentApps.slice(0, 20);
    }

    public onRecentAppClicked(recentApp: BrowsedAppInfo) {
        this.urlPicked.emit(recentApp.url);
    }

    public getShortRecentAppDescription(recentApp: BrowsedAppInfo): string {
        if (!recentApp.description)
            return "";

        const limit = 50;
        if (recentApp.description.length < limit)
            return recentApp.description;
        else
            return recentApp.description.substring(0, limit) + "...";
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

    public getAllDAppsWithInfo(): BrowsedAppInfo[] {
      let appInfos: BrowsedAppInfo[] = [];
      for (let app of this.dApps) {
          appInfos.push({
            url: app.url,
            title: app.title,
            description: app.description,
            iconUrl: app.icon,
            lastBrowsed: 0,
            network: this.walletNetworkService.activeNetwork.value.key,
            useExternalBrowser: app.useExternalBrowser
          });
      }
      return appInfos;
    }
}
