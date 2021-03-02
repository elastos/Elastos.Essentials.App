import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor(
    private globalTheme: GlobalThemeService
  ) {
    // This will be triggered when first subscribing, and when the dark more pref is changed
    this.globalTheme.activeTheme.subscribe((theme)=>{
      if (theme == AppTheme.DARK) {
        // Set dark mode globally
        document.body.classList.add("dark");

        // Set dark mode to native header
        // TODO @chad titleBarManager.setBackgroundColor("#191a2f");
        // TODO @chad titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.LIGHT);

      } else {
        // Remove dark mode globally
        document.body.classList.remove("dark");

        // Remove dark mode to native header
        // TODO @chad titleBarManager.setBackgroundColor("#f8f8ff");
        // TODO @chad titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.DARK);
      }
    })
  }

  public get darkMode(): boolean {
    return this.globalTheme.darkMode;
  };

  public get isAndroid(): boolean {
    return this.globalTheme.isAndroid;
  };
}
