import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public darkMode = false;

  constructor(private platform: Platform, private globalThemeService: GlobalThemeService) {
    this.globalThemeService.activeTheme.subscribe((newTheme)=>{
      this.setTheme(newTheme == AppTheme.DARK);
    })
  }

  setTheme(dark) {
    this.darkMode = dark;
    if (this.darkMode) {
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
  }
}
