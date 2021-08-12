import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DeveloperService } from '../../services/developer.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { SettingsService } from '../../services/settings.service';

type Preferences = {
  developerMode: boolean
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  prefs: Preferences = {
    developerMode: false
  };

  public hasConfigSections = false

  constructor(
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private nav: GlobalNavService,
    private prefsService: GlobalPreferencesService,
    private settingsService: SettingsService
  ) {
    void this.init();
  }

  ngOnInit() {
  }

  async init() {
    this.hasConfigSections = true;

    // Retrieve current settings
    let prefs = await this.prefsService.getPreferences(GlobalDIDSessionsService.signedInDIDString);
    this.prefs.developerMode = prefs["developer.mode"];
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('launcher.app-settings'));
  }

  ionViewDidEnter() {
  }

  async onChangePassword() {
    await this.settingsService.changePassword();
  }

  toggleDeveloperMode() {
    void this.prefsService.setPreference(GlobalDIDSessionsService.signedInDIDString, "developer.mode", this.prefs.developerMode);
    if (!this.prefs.developerMode) {
        this.developer.resetNet();
    }
  }

  open(router: string){
    void this.nav.navigateTo(App.SETTINGS, router);
  }
}
