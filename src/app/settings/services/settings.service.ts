import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AppVersion } from '@awesome-cordova-plugins/app-version/ngx';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version = '';

  constructor(
    private sanitizer: DomSanitizer,
    private native: GlobalNativeService,
    private appVersion: AppVersion,
  ) { }

  init() {
    this.getRuntimeVersion();
  }

  public async changePassword() {
    Logger.log('Settings', 'changePassword');

    try {
      const result = await passwordManager.changeMasterPassword();
      Logger.log('Settings', 'changePassword result', result);
      result ? this.native.genericToast('settings.change-pw-success') : this.native.genericToast('settings.change-pw-fail');
    } catch(err) {
      Logger.log('Settings', 'changePassword err', err);
      this.native.genericToast('settings.change-pw-fail');
    }
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  display_err(err) {
    void this.native.genericAlert(err);
  }

  getRuntimeVersion() {
    this.appVersion.getVersionNumber().then(res => {
      this.version = res;
    }).catch(error => {
      Logger.error('Settings', 'getVersionNumber error:', error);
    });
  }
}
