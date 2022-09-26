import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-easy-bridge',
  templateUrl: './easy-bridge.widget.html',
  styleUrls: ['./easy-bridge.widget.scss'],
})
export class EasyBridgeWidget implements IWidget {
  public forSelection: boolean; // Initialized by the widget service

  public app: RunnableApp = {
    id: 'easybridge',
    routerContext: App.EASY_BRIDGE,
    name: this.translate.instant('launcher.app-easybridge'),
    description: this.translate.instant('launcher.app-easybridge-description'),
    icon: '/assets/launcher/apps/app-icons/easybridge.svg',
    hasWidget: false,
    routerPath: '/easybridge/home'
  };

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService
  ) { }
}
