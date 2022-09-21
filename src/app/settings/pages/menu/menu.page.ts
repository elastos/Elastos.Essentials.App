import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DeveloperService } from '../../services/developer.service';
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
    let prefs = await this.prefsService.getPreferences(DIDSessionsStore.signedInDIDString);
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
    void this.prefsService.setPreference(DIDSessionsStore.signedInDIDString, "developer.mode", this.prefs.developerMode);
    if (!this.prefs.developerMode) {
      void this.developer.resetNet();
    }
  }

  open(router: string) {
    void this.nav.navigateTo(App.SETTINGS, router);
  }
}
