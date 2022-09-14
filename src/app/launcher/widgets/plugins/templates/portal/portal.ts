import { Component, Input } from '@angular/core';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PluginConfig, PortalContent } from '../../../base/pluginconfig';

@Component({
  selector: 'portal-template',
  templateUrl: './portal.html',
  styleUrls: ['./portal.scss'],
})
export class PortalTemplate {
  @Input("config")
  public config: PluginConfig<PortalContent> = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private dappBrowserService: DappBrowserService
  ) { }

  public onProjectLogoClicked() {
    if (!this.config.url)
      return;

    void this.dappBrowserService.openForBrowseMode(this.config.url);
  }

  public onActionClicked(index: number) {
    void this.dappBrowserService.openForBrowseMode(this.config.content.items[index].url);
  }
}
