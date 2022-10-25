import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-discover-dapps',
  templateUrl: './discover-dapps.widget.html',
  styleUrls: ['./discover-dapps.widget.scss'],
})
export class DiscoverDAppsWidget extends WidgetBase {
  public app: RunnableApp = {
    id: 'discoverdapps',
    routerContext: App.DAPP_BROWSER,
    name: this.translate.instant('launcher.app-browser'),
    description: this.translate.instant('launcher.app-browser-description'),
    icon: '/assets/launcher/apps/app-icons/browser.svg',
    hasWidget: false,
    routerPath: "/dappbrowser/home"
  };

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService
  ) {
    super();
    this.notifyReadyToDisplay();
  }

  public customizeSVGID = customizedSVGID;
}
