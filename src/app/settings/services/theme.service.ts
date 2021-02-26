import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

declare let appManager: AppManagerPlugin.AppManager;
declare let titleBarManager: TitleBarPlugin.TitleBarManager;

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  public darkMode = false;
  public isAndroid = false;
  
  constructor(
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.getTheme();
    });
  }

  getTheme() {
    if (this.platform.platforms().indexOf('android') === 0) {
      this.isAndroid = true;
    }

    appManager.getPreference("ui.darkmode", (value)=>{
      console.log("GOT DARK MODE PREF", value)
      this.darkMode = value;
      this.setTheme(this.darkMode);
    }, (err)=>{
      console.error(err);
    });
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    console.log("SET DARK MODE PREF", this.darkMode)
    appManager.setPreference("ui.darkmode", this.darkMode, ()=>{
    }, (err)=>{
      console.error("toggleTheme() setPreference() error:", err)
    });
    this.setTheme(this.darkMode);
  }

  setTheme(dark) {
    this.darkMode = dark;
    if (this.darkMode) {
      // Set dark mode globally
      document.body.classList.add("dark");

      // Set dark mode to native header
      titleBarManager.setBackgroundColor("#191a2f");
      titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.LIGHT);

    } else {
      // Remove dark mode globally
      document.body.classList.remove("dark");

      // Remove dark mode to native header
      titleBarManager.setBackgroundColor("#f8f8ff");
      titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.DARK);
    }
  }
}
