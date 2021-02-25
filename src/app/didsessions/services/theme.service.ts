import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { DIDSessionsService } from 'src/app/services/didsessions.service';
import { PreferencesService } from 'src/app/services/preferences.service';

// TODO @chad - Remove this didsessions specific theme service and use the global theme service
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public darkMode = false;

  constructor(private platform: Platform, private prefs: PreferencesService, private didSessions: DIDSessionsService) {
    this.platform.ready().then(() => {
      this.getTheme();
    });
  }

  async getTheme() {
    let value = await this.prefs.getPreference<boolean>(DIDSessionsService.signedInDIDString, "ui.darkmode");
    this.darkMode = value;
    this.setTheme(this.darkMode);
  }

  setTheme(dark) {
    this.darkMode = dark;
    if (this.darkMode) {
      // Set dark mode globally
      document.body.classList.add("dark");

      // Set dark mode to native header
      // TODO @chad - titleBarManager.setBackgroundColor("#191a2f");
      // TODO @chad - titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.LIGHT);

    } else {
      // Remove dark mode globally
      document.body.classList.remove("dark");

      // Remove dark mode to native header
      // TODO @chad - titleBarManager.setBackgroundColor("#f8f8ff");
      // TODO @chad - titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.DARK);
    }
  }
}
