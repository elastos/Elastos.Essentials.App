import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIconSlot, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private globalNav: GlobalNavService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('common.settings'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
  }

  goToSettings(route: string) {
    this.globalNav.navigateTo(App.IDENTITY, route);
  }

}
