import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AppVersion } from '@awesome-cordova-plugins/app-version/ngx';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalPasswordService } from 'src/app/services/global.password.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { environment } from 'src/environments/environment';


type CheckedVersion = {
  platform: "android" | "ios";
  userVersion: string; // Current version given by the user
  userVersionCode: number; // eg: 20503
  latestVersion: string; // Most recent version string for the platform. Eg: "2.5.4"
  latestVersionCode: number; // eg: 20504
  gitTag: string; // Release tag on git
  shouldUpdate: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version = '';

  constructor(
    private sanitizer: DomSanitizer,
    private native: GlobalNativeService,
    private appVersion: AppVersion,
    private platform: Platform,
    private notifications: GlobalNotificationsService,
    private storage: GlobalStorageService,
    private translate: TranslateService,
    private globalPasswordService: GlobalPasswordService,
    private jsonRPCService: GlobalJsonRPCService
  ) { }

  init() {
    this.getRuntimeVersion();

    runDelayed(() => this.checkLatestVersionAndNotify(), 10000);
  }

  public async changePassword() {
    Logger.log('Settings', 'changePassword');

    try {
      const result = await this.globalPasswordService.changeMasterPassword();
      Logger.log('Settings', 'changePassword result', result);
      result ? this.native.genericToast('settings.change-pw-success') : this.native.genericToast('settings.change-pw-fail');
    } catch (err) {
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

  public async fetchVersionInfo(): Promise<CheckedVersion> {
    Logger.log("settings", "Checking is there is a newer application version available");

    let platform = this.platform.platforms().indexOf('android') >= 0 ? "android" : "ios";
    let requestUrl = `${environment.EssentialsAPI.serviceUrl}/updates/checkversion?version=${this.version}&platform=${platform}`;
    try {
      return <CheckedVersion>await this.jsonRPCService.httpGet(requestUrl);
    }
    catch (e) {
      Logger.error('settings', 'fetchVersionInfo() error:', e)
      return null;
    }
  }

  /**
   * Checks on the essentials api if we are using the most recent version. If not, a notification is sent
   * to the user to remind him to update.
   */
  private async checkLatestVersionAndNotify() {
    try {
      let checkedVersion = await this.fetchVersionInfo();
      if (checkedVersion) {
        if (!checkedVersion.shouldUpdate)
          Logger.log("settings", "The application is up to date");
        else {
          Logger.log("settings", `The application is not up to date. Current version: ${checkedVersion.userVersion}, latest version: ${checkedVersion.latestVersion}`);

          let notifiedVersions = await this.storage.getSetting(null, null, "settings", "notified-app-updates", []);

          if (notifiedVersions.includes(checkedVersion.latestVersion)) {
            // Already notified to user earlier, do nothing
            return;
          }

          void this.notifications.sendNotification({
            key: 'app-update-available',
            title: this.translate.instant('settings.new-version-available-notif-title'),
            message: this.translate.instant('settings.new-version-available-notif-info', { latestVersion: checkedVersion.latestVersion }),
            app: App.SETTINGS,
            url: "/settings/about"
          });

          notifiedVersions.push(checkedVersion.latestVersion);
          await this.storage.setSetting(null, null, "settings", "notified-app-updates", notifiedVersions);
        }
      }
    }
    catch (err) {
      Logger.error('settings', 'checkLatestVersion() error:', err)
      return null;
    }
  }
}
