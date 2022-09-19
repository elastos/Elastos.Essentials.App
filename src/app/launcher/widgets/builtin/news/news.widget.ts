import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { NotificationManagerService } from 'src/app/launcher/services/notificationmanager.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { IWidget } from '../../base/iwidget';
import { NewsContent, NewsContentItem, PluginConfig } from '../../base/pluginconfig';
import { WidgetHolderComponent } from '../../base/widget-holder/widget-holder.component';
import { WidgetState } from '../../base/widgetstate';
import { NewsSource, WidgetsNewsService } from '../../services/news.service';
import { WidgetPluginsService } from '../../services/plugin.service';
import { WidgetsServiceEvents } from '../../services/widgets.events';
import { NewsConfiguratorComponent } from './components/configurator/configurator.component';

const ROTATION_TIME_SEC = 10;

/**
 * Mix of raw news source config with real news content.
 */
export type DisplayableNews = {
  source: NewsSource;
  config: PluginConfig<NewsContent>; // Whole json plugin parent.
  news: NewsContentItem;
}

@Component({
  selector: 'news',
  templateUrl: './news.widget.html',
  styleUrls: ['./news.widget.scss'],
})
export class NewsWidget implements IWidget, OnInit, OnDestroy {
  @Input("config")
  public config: PluginConfig<NewsContent> = null;

  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  private modal: HTMLIonModalElement = null;

  public news: DisplayableNews[] = [];

  public transitioning = false;

  public pageIndexes = [0, 1, 2];
  private activePageIndex = 0;
  private rotationTimeout: any = null;

  constructor(
    public theme: GlobalThemeService,
    public notificationService: NotificationManagerService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetPluginsService: WidgetPluginsService,
    private dappBrowserService: DappBrowserService,
    private popoverCtrl: PopoverController,
    private modalController: ModalController
  ) {
    this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });
  }

  ngOnDestroy() {
    if (this.modal) {
      void this.modal.dismiss();
      this.modal = null;
    }

    clearTimeout(this.rotationTimeout);
  }

  attachWidgetState(widgetState: WidgetState) {
    this.widgetsNewsService.sources.subscribe(newsSources => {
      void this.prepareNews(newsSources);
    });
  }

  attachHolder(holder: WidgetHolderComponent) {
    // Tell the holder that we have custom capabilities so that a "configure" icon can be shown in edition mode
    holder.setOnConfigureIconClickedListener(() => {
      void this.showConfigurator();
    });
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

  private updateActiveNews() {
    let numberOfPages = Math.ceil(this.news.length / this.pageIndexes.length);
    if (numberOfPages > 1) {
      // Fade out
      this.transitioning = true;

      // Change data while invisible
      setTimeout(() => {
        this.activePageIndex = (this.activePageIndex + 1) % numberOfPages;

        // fade in
        this.transitioning = false;
      }, 500);
    }

    this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  public hasItemAt(itemIndexInPage: number): boolean {
    return !!this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage];
  }

  public getIcon(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].config.logo; // Project logo
  }

  public getSender(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].config.projectname || "";
  }

  public getTitle(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].news.title || "";
  }

  public getMessage(itemIndexInPage: number): string {
    let message = this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].news.info || "";
    if (message.length > 50)
      message = message.substring(0, 50) + "...";
    return message;
  }

  public onProjectLogoClicked() {
    if (!this.config.url)
      return;

    void this.dappBrowserService.openForBrowseMode(this.config.url);
  }

  public onItemClicked(event: MouseEvent, itemIndexInPage: number) {
    event.stopImmediatePropagation();

    let url = this.config.content.items[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].action || null;

    if (url)
      void this.dappBrowserService.openForBrowseMode(url);
  }

  /**
 * Background area clicked, force rotation
 */
  public onBackgroundClicked() {
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout);
      this.rotationTimeout = null;
    }

    this.updateActiveNews();
  }

  private async showConfigurator() {
    /* let options: WalletChooserComponentOptions = {
      currentNetworkWallet: this.walletService.activeNetworkWallet.value,
      filter,
      showActiveWallet: false
  }; */

    let modal = await this.popoverCtrl.create({
      cssClass: 'popup-base news-widget-configurator-popup ' + (this.theme.darkMode ? 'darkContainer' : ''),
      mode: 'ios',
      component: NewsConfiguratorComponent,
      //componentProps: options,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
    modal.onWillDismiss().then(async (params) => {
      Logger.log('widgets', 'News configurator dismissed');
    });
    void modal.present();
  }

  async showFullNews(event?: MouseEvent) {
    event?.stopImmediatePropagation();

    const FullNewsPage = (await import('./components/fullnews/fullnews.page')).FullNewsPage; // Cirdcular deps + perf
    const modal = await this.modalController.create({
      component: FullNewsPage,
      cssClass: 'running-modal',
      mode: 'ios',
    });
    void modal.onDidDismiss().then(() => { });
    void modal.present();
  }
}
