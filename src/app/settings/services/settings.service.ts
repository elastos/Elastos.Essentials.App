import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version: string = '';

  constructor(
    private sanitizer: DomSanitizer,
    private essentialsIntent: TemporaryAppManagerPlugin,
    private native: GlobalNativeService
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
    this.essentialsIntent.getVersion((val) => {
      this.version = val;
      console.log('elastOS version', this.version);
    });
  }
}
