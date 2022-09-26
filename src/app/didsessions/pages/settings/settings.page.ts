import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from '../../services/ux.service';

@Component({
  selector: 'app-didsessions-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  public hasConfigSections = false

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private nav: GlobalNavService,
    public uxService: UXService,
    private prefsService: GlobalPreferencesService
  ) {
    this.init();
  }

  ngOnInit() {
  }

  init() {
    this.hasConfigSections = true;
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('launcher.app-settings'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  open(router: string) {
    void this.nav.navigateTo(App.SETTINGS, router);
  }
}
