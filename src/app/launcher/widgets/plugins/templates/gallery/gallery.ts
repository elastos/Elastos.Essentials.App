import { Component, Input } from '@angular/core';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GalleryContent, PluginConfig } from '../../../base/pluginconfig';

const ROTATION_TIME_SEC = 10;

@Component({
  selector: 'gallery-template',
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.scss'],
})
export class GalleryTemplate {
  @Input("config")
  public config: PluginConfig<GalleryContent> = null;

  public transitioning = false;
  public pageIndexes = [0, 1];

  private activePageIndex = 0;
  private rotationTimeout: any = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private dappBrowserService: DappBrowserService
  ) {
    this.rotationTimeout = setTimeout(() => { this.updateRotation(); }, ROTATION_TIME_SEC * 1000);
  }

  private updateRotation() {
    let numberOfPages = Math.ceil(this.config.content.items.length / 2);
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

    // Continue the timer even if only one page, in case the developer reloads a new JSOn with more data
    this.rotationTimeout = setTimeout(() => { this.updateRotation(); }, ROTATION_TIME_SEC * 1000);
  }

  public hasItemAt(itemIndexInPage: number): boolean {
    return !!this.config.content.items[this.activePageIndex * 2 + itemIndexInPage];
  }

  public getTitle(itemIndexInPage: number): string {
    return this.config.content.items[this.activePageIndex * 2 + itemIndexInPage].title || "";
  }

  public getSubInfo(itemIndexInPage: number): string {
    return this.config.content.items[this.activePageIndex * 2 + itemIndexInPage].subinfo || null;
  }

  public getIcon(itemIndexInPage: number): string {
    return this.config.content.items[this.activePageIndex * 2 + itemIndexInPage].picture;
  }

  public onProjectLogoClicked() {
    if (!this.config.url)
      return;

    void this.dappBrowserService.openForBrowseMode(this.config.url);
  }

  public onItemClicked(event: MouseEvent, itemIndexInPage: number) {
    event.stopImmediatePropagation();

    let url = this.config.content.items[this.activePageIndex * 2 + itemIndexInPage].url || null;

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

    this.updateRotation();
  }
}
