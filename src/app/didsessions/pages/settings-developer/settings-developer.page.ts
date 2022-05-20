import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UXService } from '../../services/ux.service';

@Component({
  selector: 'app-settings-developer',
  templateUrl: './settings-developer.page.html',
  styleUrls: ['./settings-developer.page.scss'],
})
export class SettingsDeveloperPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public uxService: UXService,
    private nav: GlobalNavService,
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.developer-options'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  go(route: string) {
    void this.nav.navigateTo(App.SETTINGS, route);
  }
}
