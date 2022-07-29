import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { BrowsedAppInfo } from 'src/app/dappbrowser/model/browsedappinfo';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-recent-apps',
  templateUrl: './recent-apps.widget.html',
  styleUrls: ['./recent-apps.widget.scss'],
})
export class RecentAppsWidget implements Widget {
  public forSelection: boolean; // Initialized by the widget service

  private recentAppsSub: Subscription = null; // Susbcription to recently used dApps (browser)
  public recentApps: BrowsedAppInfo[] = [];

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private browserService: DappBrowserService,
    private globalNavService: GlobalNavService,
    private walletNetworkService: WalletNetworkService,
    private appBackGroundService: GlobalAppBackgroundService
  ) { }

  onWidgetInit(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.recentAppsSub = this.browserService.recentApps.subscribe(async () => {
      this.recentApps = await this.browserService.getRecentAppsWithInfo();
    });
    return;
  }

  onWidgetDeinit(): Promise<void> {
    if (this.recentAppsSub) {
      this.recentAppsSub.unsubscribe();
      this.recentAppsSub = null;
    }
    return;
  }

  public openDApps() {
    //this.browserService.clearRecentApps(); // TMP
    void this.globalNavService.navigateTo(App.DAPP_BROWSER, "/dappbrowser/home");
  }

  public openRecentApp(app: BrowsedAppInfo) {
    void this.browserService.openRecentApp(app);
  }

  public getShortRecentAppTitle(app: BrowsedAppInfo): string {
    if (app.title.length > 9)
      return app.title.substr(0, 9) + "...";
    else
      return app.title;
  }

  public getRecentAppNetworkIcon(app: BrowsedAppInfo): string {
    let network = this.walletNetworkService.getNetworkByKey(app.network);
    if (!network)
      return transparentPixelIconDataUrl();

    return network.logo;
  }
}
