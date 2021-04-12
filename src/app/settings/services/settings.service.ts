import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { GlobalNativeService } from 'src/app/services/global.native.service';
// import { GlobalIntentService } from 'src/app/services/global.intent.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    // private globalIntentService: GlobalIntentService,
    private native: GlobalNativeService,
    private appVersion: AppVersion
  ) { }

  async init() {
    this.getRuntimeVersion();
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  display_err(err) {
    this.native.genericAlert(err);
  }

  getRuntimeVersion() {
    this.appVersion.getVersionNumber().then(res => {
      this.version = res;
    }).catch(error => {
      alert(error);
    });
  }
}
