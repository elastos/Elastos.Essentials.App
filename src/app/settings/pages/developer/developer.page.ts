import { Component, OnInit, ViewChild } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalSecurityService } from 'src/app/services/global.security.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { DeveloperService } from '../../services/developer.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-developer',
  templateUrl: './developer.page.html',
  styleUrls: ['./developer.page.scss'],
})
export class DeveloperPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public allowScreenCapture = false;
  public captureLogs = false;

  constructor(
    private platform: Platform,
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private clipboard: Clipboard,
    private native: GlobalNativeService,
    private globalSecurityService: GlobalSecurityService,
    private globalsPrefsService: GlobalPreferencesService,
    private nav: GlobalNavService,
  ) { }

  ngOnInit() { }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.developer-options'));

    this.allowScreenCapture = await this.globalSecurityService.getScreenCaptureAllowed();
    this.captureLogs = await this.globalsPrefsService.getCollectLogs(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
  }

  ionViewWillLeave() {
  }

  getBackgroundServicesTitle() {
    if (!this.developer.backgroundServicesEnabled) {
      return this.translate.instant('settings.background-services-disabled');
    } else {
      return this.translate.instant('settings.background-services-enabled');
    }
  }

  go(route: string) {
    void this.nav.navigateTo(App.SETTINGS, route);
  }

  public onAllowScreenCaptureChanged() {
    void this.globalSecurityService.setScreenCaptureAllowed(this.allowScreenCapture);
  }

  public onAllowCaptureLogsChanged() {
    void this.globalsPrefsService.setCollectLogs(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, this.captureLogs);
  }

  public exportLogs() {
    let devLogs = Logger.getDevLogs();

    void this.clipboard.copy(JSON.stringify(devLogs));
    this.native.genericToast('common.copied-to-clipboard', 2000, "success");
  }

  public isAndroid(): boolean {
    return this.platform.platforms().indexOf('android') >= 0;
  }
}
