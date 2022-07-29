import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-easy-bridge',
  templateUrl: './easy-bridge.widget.html',
  styleUrls: ['./easy-bridge.widget.scss'],
})
export class EasyBridgeWidget implements Widget {
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

  onWidgetInit(): Promise<void> {
    return;
  }
}
