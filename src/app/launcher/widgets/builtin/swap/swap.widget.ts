import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { UIToken } from 'src/app/multiswap/model/uitoken';
import { MultiSwapHomePageParams } from 'src/app/multiswap/pages/home/home';
import { SwapUIService } from 'src/app/multiswap/services/swap.ui.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-swap',
  templateUrl: './swap.widget.html',
  styleUrls: ['./swap.widget.scss'],
})
export class SwapWidget implements IWidget {
  public forSelection: boolean; // Initialized by the widget service

  public sourceToken: UIToken = null;
  public destinationToken: UIToken = null;

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    private nav: GlobalNavService,
    private swapUIService: SwapUIService
  ) { }

  public onSwapClicked() {
    this.navToSwapScreen();
  }

  public async pickToken(forSource: boolean, token: UIToken) {
    let pickedToken = await this.swapUIService.pickToken(forSource, forSource || !this.sourceToken ? null : this.sourceToken.token)

    if (forSource)
      this.sourceToken = pickedToken;
    else
      this.destinationToken = pickedToken;

    // Both source and dest just got selected? Automatically open the swap screen
    if (this.sourceToken && this.destinationToken)
      this.navToSwapScreen();
  }

  private navToSwapScreen() {
    let params: MultiSwapHomePageParams = {
      sourceToken: this.sourceToken,
      destinationToken: this.destinationToken
    };

    void this.nav.navigateTo(App.MULTI_SWAP, "/multiswap/home", {
      state: params
    });
  }
}
