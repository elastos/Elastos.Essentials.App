import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
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

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    private nav: GlobalNavService
  ) { }

  public onSwapClicked() {
    void this.nav.navigateTo(App.MULTI_SWAP, "/multiswap/home");
  }
}
