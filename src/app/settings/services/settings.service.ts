import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
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
    // TODO
    // this.globalIntentService.getVersion((val) => {
    //   this.version = val;
    //   console.log('elastOS version', this.version);
    // });
  }
}
