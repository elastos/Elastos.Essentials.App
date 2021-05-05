import { Component, ViewChild } from '@angular/core';
import { DAppService } from '../../services/dapp.service';
import { StorageDApp } from '../../model/storagedapp.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { TranslateService } from '@ngx-translate/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['home.scss']
})
export class HomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    public dappService: DAppService,
    public translate: TranslateService,
    private nav: GlobalNavService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('developertools.dev-toolbox'));
    this.titleBar.setBackgroundColor("#181d20");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
  }

  newApp() {
    Logger.log("developertools", "new app")
    this.nav.navigateTo(App.DEVELOPER_TOOLS, "/developertools/createapp");
  }

  openApp(app: StorageDApp) {
    this.nav.navigateTo(
      App.DEVELOPER_TOOLS, "/developertools/appdetails", { state: { "app": app } }
    );
  }
}
