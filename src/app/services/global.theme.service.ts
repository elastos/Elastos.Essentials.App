import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AppmanagerService } from '../launcher/services/appmanager.service';
import { DIDSessionsService } from './didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';

export enum AppTheme {
  LIGHT,
  DARK
}

@Injectable({
  providedIn: 'root'
})
export class GlobalThemeService {
  public activeTheme = new BehaviorSubject<AppTheme>(AppTheme.LIGHT);

  public isAndroid = false;

  constructor(private platform: Platform, private prefs: GlobalPreferencesService, private didSessions: DIDSessionsService) {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        // Re-apply the theme for the active user.
        this.fetchThemeFromPreferences();
      }
    })

    this.prefs.preferenceListener.subscribe((prefChanged)=>{
      if (prefChanged.key == "ui.darkmode") {
        let darkMode = prefChanged.value as boolean;
        if (darkMode)
          this.activeTheme.next(AppTheme.DARK);
        else
          this.activeTheme.next(AppTheme.LIGHT);
      }
    });
  }

  private async fetchThemeFromPreferences() {
    if (this.platform.platforms().indexOf('android') === 0) {
      this.isAndroid = true;

      // Let's initialize the backup service asynchronously without blocking the UI
      // TODO @chad: why is ths backup service initialized from the theme service ?
      // TODO @chad: this is launcher's backup service. Move to launcher folder and initialize in a better location
      // this.backupService.init();
    }
    console.log("DEBUG-B");
    let currentlyUsingDarkMode = await this.prefs.getPreference<boolean>(DIDSessionsService.signedInDIDString, "ui.darkmode");
    if (currentlyUsingDarkMode)
      this.activeTheme.next(AppTheme.DARK);
    else
      this.activeTheme.next(AppTheme.LIGHT);

    console.log("Loaded theme from preferences: ", this.activeTheme.value);
  }

  public async toggleTheme() {
    console.log("Theme toggle");
    await this.prefs.setPreference(DIDSessionsService.signedInDIDString, "ui.darkmode", this.activeTheme.value == AppTheme.DARK ? false : true);
  }

  // Convenient getter for backward compatibility from elastOS 1.x
  public get darkMode() {
    return this.activeTheme.value == AppTheme.DARK;
  }
}
