import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from "src/app/model/app.enum";
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
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
    private settingsService: SettingsService,
    public didService: DIDManagerService,
    private appBackGroundService: GlobalAppBackgroundService
  ) {
    GlobalFirebaseService.instance.logEvent("settings_menu_enter");
    void this.init();
  }

  ngOnInit() {
  }

  async init() {
    this.hasConfigSections = true;

    // Retrieve current settings
    let prefs = await this.prefsService.getPreferences(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
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

  async toggleDeveloperMode() {
    await this.prefsService.setPreference(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "developer.mode", this.prefs.developerMode);
    if (!this.prefs.developerMode) {
      await this.developer.reset();
    }
  }

  open(router: string) {
    void this.nav.navigateTo(App.SETTINGS, router);
  }

  async signOut() {
    await this.appBackGroundService.stop();
    await this.didService.signOut();
  }
}
