import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-red-packets',
  templateUrl: './red-packets.widget.html',
  styleUrls: ['./red-packets.widget.scss'],
})
export class RedPacketsWidget implements IWidget {
  public forSelection: boolean; // Initialized by the widget service

  public app: RunnableApp = {
    id: 'redpackets',
    routerContext: App.RED_PACKETS,
    name: this.translate.instant('launcher.app-redpackets'),
    description: this.translate.instant('launcher.app-redpackets-description'),
    icon: '/assets/launcher/apps/app-icons/redpackets.png',
    hasWidget: false,
    routerPath: '/redpackets/home'
  };

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService
  ) { }
}
