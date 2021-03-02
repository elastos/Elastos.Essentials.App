import { Injectable, NgZone } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public version: string = '';

  constructor(
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private navCtrl: NavController,
    private appManager: TemporaryAppManagerPlugin) { }

  async init() {
    this.getRuntimeVersion();

    // Load app manager only on real device, not in desktop browser - beware: ionic 4 bug with "desktop" or "android"/"ios"
    /* TODO @chad titleBarManager.addOnItemClickedListener((menuIcon)=>{
      if (menuIcon.key == "back") {
          this.navCtrl.back();
      }
    });*/
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  display_err(err) {
    // TODO @chad appManager.alertPrompt("Error", err);
  }

  getRuntimeVersion() {
    this.appManager.getVersion((val) => {
      this.version = val;
      console.log('elastOS version', this.version);
    });
  }

  setTitleBarBackKeyShown(show: boolean) {
    /* TODO @chad if (show) {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
            key: "back",
            iconPath: TitleBarPlugin.BuiltInIcon.BACK
        });
    }
    else {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
    }*/
  }
}
