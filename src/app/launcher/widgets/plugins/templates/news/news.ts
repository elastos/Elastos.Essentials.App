import { Component, Input } from '@angular/core';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NewsContent, PluginConfig } from '../../../base/plugin.types';

const ROTATION_TIME_SEC = 10;

@Component({
  selector: 'news-template',
  templateUrl: './news.html',
  styleUrls: ['./news.scss'],
})
export class NewsTemplate {
  @Input("config")
  public config: PluginConfig<NewsContent> = null;

  public transitioning = false;

  private activeNewsIndex = 0;
  private rotationTimeout: any = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private dappBrowserService: DappBrowserService
  ) {
    this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  private updateActiveNews() {
    // Fade out
    this.transitioning = true;

    // Change data while invisible
    setTimeout(() => {
      this.activeNewsIndex = (this.activeNewsIndex + 1) % this.config.content.items.length;

      // fade in
      this.transitioning = false;
    }, 500);

    this.rotationTimeout = setTimeout(() => { this.updateActiveNews(); }, ROTATION_TIME_SEC * 1000);
  }

  public getTitle(): string {
    return this.config.content.items[this.activeNewsIndex].title;
  }

  public getInfo(): string {
    return this.config.content.items[this.activeNewsIndex].info;
  }

  public getIcon(): string {
    return this.config.content.items[this.activeNewsIndex].icon;
  }

  public hasAction(): boolean {
    return !!this.config.content.items[this.activeNewsIndex].action;
  }

  public getActionTitle(): string {
    return this.config.content.items[this.activeNewsIndex].action.title;
  }

  public onProjectLogoClicked() {
    if (!this.config.url)
      return;

    void this.dappBrowserService.openForBrowseMode(this.config.url);
  }

  public onActionButtonClicked() {
    let actionUrl = this.config.content.items[this.activeNewsIndex].action.url;
    if (actionUrl)
      void this.dappBrowserService.openForBrowseMode(actionUrl);
  }

  /**
   * Info area clicked, force rotation
   */
  public onInfoClicked() {
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout);
      this.rotationTimeout = null;
    }

    this.updateActiveNews();
  }
}
