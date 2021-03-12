import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService, App } from 'src/app/services/global.nav.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    private essentialsIntent: TemporaryAppManagerPlugin,
    private nav: GlobalNavService
  ) { }

  async init() {
    this.getRuntimeVersion();
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  display_err(err) {
    // TODO @chad essentialsIntent.alertPrompt("Error", err);
  }

  getRuntimeVersion() {
    this.essentialsIntent.getVersion((val) => {
      this.version = val;
      console.log('elastOS version', this.version);
    });
  }
}
