import { Component, OnInit } from '@angular/core';
import { WidgetsFeedsNewsService } from 'src/app/launcher/widgets/services/feedsnews.service';
import { WidgetsNewsService } from 'src/app/launcher/widgets/services/news.service';
import { WidgetPluginsService } from 'src/app/launcher/widgets/services/plugin.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

type DisplayableSource = {
  icon: string;
  name: string;
  enabled: boolean;
  url: string;
}

type DisplayableChannel = {
  icon: string;
  name: string;
  enabled: boolean;
  channelId: string;
}

@Component({
  selector: 'app-news-configurator',
  templateUrl: './configurator.component.html',
  styleUrls: ['./configurator.component.scss'],
})
export class NewsConfiguratorComponent implements OnInit {
  public sources: DisplayableSource[] = [];
  public feedsChannels: DisplayableChannel[] = [];

  constructor(
    public theme: GlobalThemeService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetFeedsNewsService: WidgetsFeedsNewsService,
    private widgetPluginsService: WidgetPluginsService
  ) { }

  ngOnInit() {
    // Called when a source is deleted or its enabled status changes.
    this.widgetsNewsService.sources.subscribe(() => {
      void this.initSources();
    });

    this.widgetFeedsNewsService.channels.subscribe(() => {
      void this.initFeedsChannels();
    });
  }

  private async initSources() {
    let sources: DisplayableSource[] = [];
    for (let newsSource of this.widgetsNewsService.sources.value) {
      let content = await this.widgetPluginsService.getPluginContent(newsSource.url);

      let source: DisplayableSource = {
        icon: content.logo,
        name: content.projectname,
        enabled: newsSource.enabled,
        url: newsSource.url
      }
      sources.push(source);
    }

    this.sources = sources;
    Logger.log("widgets", "Generated sources:", this.sources);
  }

  private initFeedsChannels() {
    let channels: DisplayableChannel[] = [];
    for (let channel of this.widgetFeedsNewsService.channels.value) {
      let source: DisplayableChannel = {
        icon: channel.avatar,
        name: channel.name,
        enabled: channel.enabled,
        channelId: channel.id
      }

      channels.push(source);
    }

    this.feedsChannels = channels;
    Logger.log("widgets", "Generated feeds channels:", this.feedsChannels);
  }

  public toggleSourceEnabled(source: DisplayableSource) {
    source.enabled = !source.enabled;
    void this.widgetsNewsService.setNewsSourceEnabled(source.url, source.enabled);
  }

  public deleteSource(source: DisplayableSource) {
    void this.widgetsNewsService.removeNewsSource(source.url);
  }

  public getSelectedSourcesCount(): number {
    return this.sources.reduce((prev, curr) => curr.enabled ? prev + 1 : prev, 0);
  }

  public toggleFeedsChannelEnabled(channel: DisplayableChannel) {
    channel.enabled = !channel.enabled;
    void this.widgetFeedsNewsService.setChannelEnabled(channel.channelId, channel.enabled);
  }

  public getSelectedFeedsChannelsCount(): number {
    return this.feedsChannels.reduce((prev, curr) => curr.enabled ? prev + 1 : prev, 0);
  }
}
