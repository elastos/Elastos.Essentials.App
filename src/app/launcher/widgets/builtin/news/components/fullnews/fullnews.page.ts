import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { NewsContent, NewsContentItem, PluginConfig } from 'src/app/launcher/widgets/base/pluginconfig';
import { NewsSource, WidgetsNewsService } from 'src/app/launcher/widgets/services/news.service';
import { WidgetPluginsService } from 'src/app/launcher/widgets/services/plugin.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

/**
 * Mix of raw news source config with real news content.
 */
export type DisplayableNews = {
  source: NewsSource;
  config: PluginConfig<NewsContent>; // Whole json plugin parent.
  news: NewsContentItem;
}

@Component({
  selector: 'app-fullnews',
  templateUrl: './fullnews.page.html',
  styleUrls: ['./fullnews.page.scss'],
})
export class FullNewsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  private modalAlreadyDismissed = false;

  public news: DisplayableNews[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetPluginsService: WidgetPluginsService,
    private dappBrowserService: DappBrowserService
  ) {
  }

  ngOnInit() {
    this.widgetsNewsService.sources.subscribe(newsSources => {
      void this.prepareNews(newsSources);
    });
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setTitle(this.translate.instant('launcher.all-news'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.closePage();
    });

    if (this.theme.darkMode) {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    } else {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.DARK);
    }
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async closePage() {
    if (!this.modalAlreadyDismissed) {
      await this.modalController.dismiss();
      this.modalAlreadyDismissed = true;
    }
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private async prepareNews(newsSources: NewsSource[]) {
    let allNews: DisplayableNews[] = [];

    // For each source, get its content.
    for (let source of newsSources) {
      if (!source.enabled)
        continue; // Skip this source if disabled

      let content = <PluginConfig<NewsContent>>await this.widgetPluginsService.getPluginContent(source.url);

      for (let news of content.content.items) {
        let displayableNews: DisplayableNews = {
          source,
          config: content,
          news
        };
        allNews.push(displayableNews);
      }
    }

    // Sort all collected news by date
    allNews.sort((a, b) => b.news.timevalue - a.news.timevalue);

    this.news = allNews;
  }

  public getIcon(news: DisplayableNews): string {
    return news.config.logo; // Project logo
  }

  public getSender(news: DisplayableNews): string {
    return news.config.projectname;
  }

  public getTitle(news: DisplayableNews): string {
    return news.news.title;
  }

  public getMessage(news: DisplayableNews): string {
    return news.news.info;
  }

  public getNotificationDate(news: DisplayableNews) {
    return moment(Number(news.news.timevalue)).startOf('minutes').fromNow();
  }

  public openNews(news: DisplayableNews) {
    void this.closePage();
    void this.dappBrowserService.openForBrowseMode(news.news.action);
  }
}
