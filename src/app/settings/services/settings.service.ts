import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    private essentialsIntent: TemporaryAppManagerPlugin
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
