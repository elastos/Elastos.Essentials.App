import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DeveloperService } from '../../services/developer.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
})
export class PrivacyPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public useBuiltInBrowser = false; // Whether to launch urls in the built in browser, or in an external browser
  public publishIdentityMedium = 'assist'; // assist or wallet
  public sendCredentialToolboxStats = true;
  public useHiveDataSync = false;

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private nav: GlobalNavService,
    private prefs: GlobalPreferencesService
  ) { }

  ngOnInit() { }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.privacy'));
    await this.fetchUseBuiltInBrowser();
    await this.fetchPublishIdentityMedium();
    await this.fetchCredentialToolboxStats();
    void this.fetchHiveDataSync();
  }

  ionViewWillLeave() {
  }

  private async fetchUseBuiltInBrowser(): Promise<void> {
    this.useBuiltInBrowser = await this.prefs.getUseBuiltInBrowser(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
  }

  public getUseBuiltInBrowserTitle(): string {
    if (this.useBuiltInBrowser) {
      return this.translate.instant('settings.privacy-use-builtin-browser');
    } else {
      return this.translate.instant('settings.privacy-use-external-browser');
    }
  }

  async toggleUseBuiltInBrowser(): Promise<void> {
    this.useBuiltInBrowser = !this.useBuiltInBrowser;
    await this.prefs.setUseBuiltInBrowser(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, this.useBuiltInBrowser);
  }

  private async fetchPublishIdentityMedium(): Promise<void> {
    this.publishIdentityMedium = await this.prefs.getPublishIdentityMedium(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
  }

  public getPublishIdentityTitle(): string {
    if (this.publishIdentityMedium === 'assist') {
      return this.translate.instant('settings.publish-identity-medium-assist');
    } else {
      return this.translate.instant('settings.publish-identity-medium-wallet');
    }
  }

  async togglePublishIdentityMedium(): Promise<void> {
    if (this.publishIdentityMedium === 'assist') {
      this.publishIdentityMedium = "wallet";
    }
    else {
      this.publishIdentityMedium = "assist";
    }
    await this.prefs.setPublishIdentityMedium(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, this.publishIdentityMedium as any);
  }

  private async fetchCredentialToolboxStats(): Promise<void> {
    this.sendCredentialToolboxStats = await this.prefs.getSendStatsToCredentialToolbox(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
  }

  public getCredentialToolboxTitle(): string {
    if (this.sendCredentialToolboxStats) {
      return this.translate.instant('settings.privacy-send-credential-toolbox-stats');
    } else {
      return this.translate.instant('settings.privacy-dont-send-credential-toolbox-stats');
    }
  }

  async toggleCredentialToolboxStats(): Promise<void> {
    this.sendCredentialToolboxStats = !this.sendCredentialToolboxStats;
    await this.prefs.setSendStatsToCredentialToolbox(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, this.sendCredentialToolboxStats);
  }

  open(router: string) {
    void this.nav.navigateTo(App.SETTINGS, router);
  }

  private async fetchHiveDataSync(): Promise<void> {
    this.useHiveDataSync = await this.prefs.getUseHiveSync(DIDSessionsStore.signedInDIDString);
  }

  public getHiveDataSyncTitle() {
    if (this.useHiveDataSync) {
      return this.translate.instant('settings.privacy-use-hive-data-sync');
    } else {
      return this.translate.instant('settings.privacy-dont-use-hive-data-sync');
    }
  }

  public async toggleHiveDataSync() {
    this.useHiveDataSync = !this.useHiveDataSync;
    await this.prefs.setUseHiveSync(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, this.useHiveDataSync);
  }
}
