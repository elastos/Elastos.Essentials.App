import { Injectable, NgZone } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';

declare let appManager: AppManagerPlugin.AppManager;
declare let titleBarManager: TitleBarPlugin.TitleBarManager;

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public appInfos: AppManagerPlugin.AppInfo[] = [];
  public version: string = '';
  private buildInfo: AppManagerPlugin.BuildInfo = null;

  constructor(
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private navCtrl: NavController) { }

  async init() {
    this.getAppInfo();
    this.getRuntimeVersion();
    // Menu page need the build info
    await this.getBuildInfo();

    // Load app manager only on real device, not in desktop browser - beware: ionic 4 bug with "desktop" or "android"/"ios"
    console.log("Listening to messages and intent events")
    titleBarManager.addOnItemClickedListener((menuIcon)=>{
      if (menuIcon.key == "back") {
          this.navCtrl.back();
      }
    });
  }

  getAppInfo() {
    console.log('Fetching installed apps..');

    appManager.getAppInfos((info) => {
      console.log("App infos", info)
      this.zone.run(() => {
        let unsortedApps = Object.values(info);
        this.appInfos = unsortedApps.sort((a, b) => a.name > b.name ? 1 : -1);
        console.log('Installed apps', this.appInfos);
      });
    });
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  setPluginAuthority(
    id: string,
    plugin: string,
    authority: AppManagerPlugin.PluginAuthority
  ) {
    console.log('Changing plugin authority', `${id} ${plugin} ${authority}`);
    appManager.setPluginAuthority(
      id, plugin, authority,
      () => console.log('setPluginAuthority success'),
      err => this.display_err(err)
    );
  }

  setUrlAuthority(
    id: string,
    url: string,
    authority: AppManagerPlugin.UrlAuthority
  ) {
    console.log('Changing url authority', `${id} ${url} ${authority}`);
    appManager.setUrlAuthority(
      id, url, authority,
      () => console.log('setUrlAuthority success'),
      err => this.display_err(err)
    );
  }

  display_err(err) {
    appManager.alertPrompt("Error", err);
  }

  getRuntimeVersion() {
    appManager.getVersion((val) => {
      this.version = val;
      console.log('elastOS version', this.version);
    });
  }

  async getBuildInfo(): Promise<AppManagerPlugin.BuildInfo> {
    return new Promise((resolve) => {
        if (this.buildInfo) {
            resolve(this.buildInfo);
        } else {
            appManager.getBuildInfo((buildInfo)=>{
                this.buildInfo = buildInfo;
                resolve(buildInfo);
            });
        }
    });
  }

  setTitleBarBackKeyShown(show: boolean) {
    if (show) {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
            key: "back",
            iconPath: TitleBarPlugin.BuiltInIcon.BACK
        });
    }
    else {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
    }
  }
}
