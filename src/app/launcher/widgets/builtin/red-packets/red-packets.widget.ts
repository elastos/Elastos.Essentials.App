import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-red-packets',
  templateUrl: './red-packets.widget.html',
  styleUrls: ['./red-packets.widget.scss'],
})
export class RedPacketsWidget extends WidgetBase {
  public app: RunnableApp = {
    id: 'redpackets',
    routerContext: App.RED_PACKETS,
    name: this.translate.instant('launcher.app-redpackets'),
    description: this.translate.instant('launcher.app-redpackets-description'),
    icon: '/assets/launcher/apps/app-icons/redpackets.svg',
    hasWidget: false,
    routerPath: '/redpackets/home'
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
