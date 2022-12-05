import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { UIToken } from 'src/app/multiswap/model/uitoken';
import { MultiSwapHomePageParams } from 'src/app/multiswap/pages/home/home';
import { SwapUIService } from 'src/app/multiswap/services/swap.ui.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-swap',
  templateUrl: './swap.widget.html',
  styleUrls: ['./swap.widget.scss'],
})
export class SwapWidget extends WidgetBase implements OnInit {
  public sourceToken: UIToken = null;
  public destinationToken: UIToken = null;
  public isIOS = false;
  public editing: boolean; // Widgets container is being edited

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    private nav: GlobalNavService,
    private swapUIService: SwapUIService,
    private platform: Platform
  ) {
    super();
  }

  ngOnInit() {
    // For now (3.0.0 release), remove the swap widgets on iOS as apple complains about built-in swaps.
    // We can try to disable this ios check later (with changes to get rejected).
    this.isIOS = this.platform.platforms().indexOf('android') < 0;

    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.notifyReadyToDisplay();
  }

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

  public customizeSVGID = customizedSVGID;
}
