import { Component, Input } from '@angular/core';
import BigNumber from 'bignumber.js';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PluginConfig, TokenPriceContent } from '../../../base/pluginconfig';

@Component({
  selector: 'tokenprice-template',
  templateUrl: './tokenprice.html',
  styleUrls: ['./tokenprice.scss'],
})
export class TokenPriceTemplate {
  @Input("config")
  public config: PluginConfig<TokenPriceContent> = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private dappBrowserService: DappBrowserService
  ) { }

  public onProjectLogoClicked(event: MouseEvent) {
    if (!this.config.url)
      return;

    event.stopImmediatePropagation();

    void this.dappBrowserService.openForBrowseMode(this.config.url);
  }

  public openTokenUrl() {
    void this.dappBrowserService.openForBrowseMode(this.config.content.token.url);
  }

  public getDisplayPrice(): string {
    let priceBN = new BigNumber(this.config.content.token.priceusd);
    let decimalPlaces = this.assessDecimals(priceBN);
    return '$' + priceBN.toFormat(decimalPlaces);
  }

  public getDisplayVolume(): string {
    let volume = this.config.content.token.volume24husd;
    let displayVolume: string;

    if (volume > 1000)
      displayVolume = new BigNumber(volume / 1000).toFormat(2) + "k";
    else if (volume > 1000000)
      displayVolume = new BigNumber(volume / 1000000).toFormat(2) + "m";

    displayVolume = "$" + displayVolume + " / 24h";

    return displayVolume;
  }

  private assessDecimals(value: BigNumber): number {
    if (value.gte(0.1))
      return 2;
    else if (value.gte(0.01))
      return 3;
    else if (value.gte(0.001))
      return 4;
    else if (value.gte(0.0001))
      return 5;
    else
      return 6;
  }

  public changeIsPositive(): boolean {
    return this.config.content.token.change24hpercent > 0;
  }

  public changeIsNegative(): boolean {
    return this.config.content.token.change24hpercent < 0;
  }

  public hasSecondRow(): boolean {
    return !!this.config.content.token.network ||
      !!this.config.content.token.change24hpercent ||
      !!this.config.content.token.volume24husd
  }
}
