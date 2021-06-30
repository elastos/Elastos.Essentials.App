import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
})
export class PrivacyPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public publishIdentityMedium = 'assist'; // assist or wallet

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private nav: GlobalNavService,
    private prefs: GlobalPreferencesService
  ) { }

  ngOnInit() {}

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.privacy'));
    await this.fetchPublishIdentityMedium();
  }

  ionViewWillLeave() {
  }

  private async fetchPublishIdentityMedium(): Promise<void> {
    this.publishIdentityMedium = await this.prefs.getPublishIdentityMedium(GlobalDIDSessionsService.signedInDIDString);
  }

  public getPublishIdentityTitle(): string {
    if(this.publishIdentityMedium === 'assist') {
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
    await this.prefs.setPublishIdentityMedium(GlobalDIDSessionsService.signedInDIDString, this.publishIdentityMedium as any);
  }

  open(router: string){
    void this.nav.navigateTo(App.SETTINGS, router);
  }
}
