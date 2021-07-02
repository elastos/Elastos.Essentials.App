import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

@Component({
  selector: 'app-developer',
  templateUrl: './developer.page.html',
  styleUrls: ['./developer.page.scss'],
})
export class DeveloperPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public privatenet = '';

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private nav: GlobalNavService,
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.developer-options'));
  }

  ionViewWillLeave() {
  }

  getBackgroundServicesTitle() {
    if(!this.developer.backgroundServicesEnabled) {
      return this.translate.instant('settings.background-services-disabled');
    } else {
      return this.translate.instant('settings.background-services-enabled');
    }
  }

  go(route: string) {
    void this.nav.navigateTo(App.SETTINGS, route);
  }
}
