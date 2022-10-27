import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { FeedsChannel, WidgetsFeedsNewsService } from 'src/app/launcher/widgets/services/feedsnews.service';
import { NewsSource, WidgetsNewsService } from 'src/app/launcher/widgets/services/news.service';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DisplayableNews, NewsHelper } from '../../helper';

@Component({
  selector: 'app-fullnews',
  templateUrl: './fullnews.page.html',
  styleUrls: ['./fullnews.page.scss'],
})
export class FullNewsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  private modalAlreadyDismissed = false;

  // Raw inputs
  private newsSources: NewsSource[] = [];
  private feedsChannels: FeedsChannel[] = [];

  // Displayable
  public news: DisplayableNews[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetsFeedsNewsService: WidgetsFeedsNewsService,
    private dappBrowserService: DappBrowserService,
    private globalIntentService: GlobalIntentService
  ) {
  }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.widgetsNewsService.sources.subscribe(newsSources => {
      this.newsSources = newsSources;
      void NewsHelper.prepareNews(this.newsSources, this.feedsChannels).then(news => this.news = news);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.widgetsFeedsNewsService.channels.subscribe(channels => {
      this.feedsChannels = channels;
      void NewsHelper.prepareNews(this.newsSources, this.feedsChannels).then(news => this.news = news);
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

  public getIcon(news: DisplayableNews): string {
    return news.logo; // Project logo
  }

  public getSender(news: DisplayableNews): string {
    return news.sender;
  }

  public getTitle(news: DisplayableNews): string {
    return news.news.title;
  }

  public getMessage(news: DisplayableNews): string {
    return news.news.info;
  }

  public getNotificationDate(news: DisplayableNews) {
    return moment.unix(news.news.timevalue).startOf('minutes').fromNow();
  }

  public getMediaPicture(news: DisplayableNews) {
    return news.news.picture;
  }

  public openNews(dNews: DisplayableNews) {
    void this.closePage();

    if (dNews.type === "plugin") {
      void this.dappBrowserService.openForBrowseMode(dNews.news.action);
    }
    else if (dNews.type === "feeds") {
      Logger.log("news", "Opening feeds deep link with url:", dNews.news.action)
      void this.globalIntentService.sendIntent('openurl', { url: dNews.news.action });
    }
  }
}
