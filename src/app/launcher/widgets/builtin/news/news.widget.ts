import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import moment from 'moment';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { NotificationManagerService } from 'src/app/launcher/services/notificationmanager.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { NewsContent, PluginConfig } from '../../base/pluginconfig';
import { WidgetHolderComponent } from '../../base/widget-holder/widget-holder.component';
import { WidgetBase } from '../../base/widgetbase';
import type { WidgetState } from '../../base/widgetstate';
import { FeedsChannel, WidgetsFeedsNewsService } from '../../services/feedsnews.service';
import { NewsSource, WidgetsNewsService } from '../../services/news.service';
import { WidgetsServiceEvents } from '../../services/widgets.events';
import { WidgetsService } from '../../services/widgets.service';
import { NewsConfiguratorComponent } from './components/configurator/configurator.component';
import { DisplayableNews, NewsHelper } from './helper';

const ROTATION_TIME_SEC = 10;

@Component({
  selector: 'news',
  templateUrl: './news.widget.html',
  styleUrls: ['./news.widget.scss'],
})
export class NewsWidget extends WidgetBase implements OnInit, OnDestroy {
  @Input("config")
  public config: PluginConfig<NewsContent> = null;

  public editing: boolean; // Widgets container is being edited
  public refreshingFeedsChannels = false;

  private modal: HTMLIonModalElement = null;

  // Raw inputs
  private newsSources: NewsSource[] = [];
  private feedsChannels: FeedsChannel[] = [];

  // Displayable
  public news: DisplayableNews[] = [];

  public transitioning = false;

  public pageIndexes = [0, 1, 2];
  private activePageIndex = 0;
  private rotationTimeout: any = null;

  constructor(
    public theme: GlobalThemeService,
    public notificationService: NotificationManagerService,
    private widgetsService: WidgetsService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetsFeedsNewsService: WidgetsFeedsNewsService,
    private dappBrowserService: DappBrowserService,
    private popoverCtrl: PopoverController,
    private modalController: ModalController
  ) {
    super();
    // NOTE: no auto rotation for now, this makes the UI move up/down depending on news count on each page
    //this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.notifyReadyToDisplay();
  }

  ngOnDestroy() {
    if (this.modal) {
      void this.modal.dismiss();
      this.modal = null;
    }

    clearTimeout(this.rotationTimeout);
  }

  attachWidgetState(widgetState: WidgetState) {
    super.attachWidgetState(widgetState);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.widgetsNewsService.sources.subscribe(async newsSources => {
      this.newsSources = newsSources;
      this.news = await NewsHelper.prepareNews(this.newsSources, this.feedsChannels);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.widgetsFeedsNewsService.channels.subscribe(async channels => {
      this.feedsChannels = channels;
      this.news = await NewsHelper.prepareNews(this.newsSources, this.feedsChannels);
    });

    this.widgetsFeedsNewsService.fetchingChannels.subscribe(fetching => {
      this.refreshingFeedsChannels = fetching;
    });
  }

  attachHolder(holder: WidgetHolderComponent) {
    // Tell the holder that we have custom capabilities so that a "configure" icon can be shown in edition mode
    holder.setOnConfigureIconClickedListener(() => {
      void this.showConfigurator();
    });
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

    //this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  public hasItemAt(itemIndexInPage: number): boolean {
    return !!this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage];
  }

  public getIcon(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].logo; // Project logo
  }

  public getSender(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].sender;
  }

  public getTitle(itemIndexInPage: number): string {
    return this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].news.title || "";
  }

  public getDate(itemIndexInPage: number): string {
    return moment.unix(this.news[this.activePageIndex * this.pageIndexes.length + itemIndexInPage].news.timevalue).startOf('minutes').fromNow() || "";
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

  /**
   * Launches the news refresh process
   */
  public refreshAllNews(event?: MouseEvent) {
    event?.stopImmediatePropagation();
    void this.widgetsService.refreshWidgetPluginContent(this.widgetState);
    void this.widgetsFeedsNewsService.fetchedSubscribedChannels(false); // Force refreshing all channels
  }
}
