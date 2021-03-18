import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Events } from '../../services/events.service';
import { TranslateService } from '@ngx-translate/core';
import { DIDService } from '../../services/did.service';
import { Native } from '../../services/native';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-advanced-settings',
  templateUrl: './advanced-settings.page.html',
  styleUrls: ['./advanced-settings.page.scss'],
})
export class AdvancedSettingsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    private authService: AuthService,
    private didService: DIDService,
    private events: Events,
    public translate: TranslateService,
    private native: Native,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('advanced-settings'));
  }

  public async startSync() {
    await this.authService.checkPasswordThenExecute(
      async () => {
        this.native.showLoading();
        const res = await this.didService.activeDidStore.synchronize(
          AuthService.instance.getCurrentUserPassword()
        );
        Logger.log('Identity', res);
        this.events.publish('did:didchanged');
        this.native.go("/identity/myprofile");
        this.native.hideLoading();
        this.native.toast_trans('did-sync-success');
      }, () => {
        Logger.log('Identity', "Password operation cancelled");
      },
      true,
      true
    );
  }

}
