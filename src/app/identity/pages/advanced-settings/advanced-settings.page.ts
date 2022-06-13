import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDService } from '../../services/did.service';
import { Native } from '../../services/native';

@Component({
  selector: 'app-advanced-settings',
  templateUrl: './advanced-settings.page.html',
  styleUrls: ['./advanced-settings.page.scss'],
})
export class AdvancedSettingsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    private didService: DIDService,
    private events: GlobalEvents,
    public translate: TranslateService,
    private native: Native,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('identity.advanced-settings'));
  }

  public async startSync() {
    await this.native.showLoading();

    try {
      await this.didService.activeDidStore.synchronize();
      await this.native.hideLoading();
      this.events.publish('did:didchanged');
      this.native.toast_trans('identity.did-sync-success');
      await this.native.go("/identity/myprofile/home");
    }
    catch (err) {
      Logger.error('identity', ' synchronize:', err)
      await this.native.hideLoading();
      this.native.toast_trans('identity.did-sync-error');
    }
  }

}
