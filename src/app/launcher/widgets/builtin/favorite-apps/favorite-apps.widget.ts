import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BrowserFavorite } from 'src/app/dappbrowser/model/favorite';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { FavoritesService } from 'src/app/dappbrowser/services/favorites.service';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-favorite-apps',
  templateUrl: './favorite-apps.widget.html',
  styleUrls: ['./favorite-apps.widget.scss'],
})
export class FavoriteAppsWidget implements IWidget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service

  private favoritesSub: Subscription = null;

  public favorites: BrowserFavorite[] = [];

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private browserService: DappBrowserService,
    private favoritesService: FavoritesService,
    private globalNavService: GlobalNavService
  ) { }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.favoritesSub = this.favoritesService.sortedFavorites.subscribe(favorites => {
      if (favorites)
        this.favorites = favorites.slice(0, 4); // Max 4 apps shown
    });

    return;
  }

  ngOnDestroy() {
    if (this.favoritesSub) {
      this.favoritesSub.unsubscribe();
      this.favoritesSub = null;
    }
  }

  public openDApps() {
    //this.browserService.clearRecentApps(); // TMP
    void this.globalNavService.navigateTo(App.DAPP_BROWSER, "/dappbrowser/home");
  }

  public openFavoriteApp(app: BrowserFavorite) {
    void this.browserService.open(app.url);
  }

  public getShortTitle(app: BrowserFavorite): string {
    if (app.name.length > 9)
      return app.name.substr(0, 9) + "...";
    else
      return app.name;
  }

  public customizeSVGID = customizedSVGID;
}
