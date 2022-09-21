import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-news-configurator',
  templateUrl: './configurator.component.html',
  styleUrls: ['./configurator.component.scss'],
})
export class NewsConfiguratorComponent implements OnInit {

  public sources: DisplayableSource[] = [];

  constructor(
    public theme: GlobalThemeService,
    private widgetsNewsService: WidgetsNewsService,
    private widgetPluginsService: WidgetPluginsService
  ) { }

  ngOnInit() {
    // Called when a source is deleted or its enabled status changes.
    this.widgetsNewsService.sources.subscribe(() => {
      void this.initSources();
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
}
