import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AppmanagerService } from '../launcher/services/appmanager.service';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { Event } from '@angular/router';
import { TitleBarForegroundMode } from '../components/titlebar/titlebar.types';

export enum AppTheme {
  LIGHT,
  DARK
}

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalThemeService {
  public activeTheme = new BehaviorSubject<AppTheme>(AppTheme.LIGHT);

  public isAndroid = false;

  constructor(
    private platform: Platform,
    private prefs: GlobalPreferencesService,
    private didSessions: GlobalDIDSessionsService,
  ) {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        // Re-apply the theme for the active user.
        this.fetchThemeFromPreferences();
      }
      else {
        // Default mode for password popups: light
        passwordManager.setDarkMode(false);
      }
    })

    this.prefs.preferenceListener.subscribe((prefChanged)=>{
      if (prefChanged.key == "ui.darkmode") {
        let darkMode = prefChanged.value as boolean;
        passwordManager.setDarkMode(darkMode);

        if (darkMode)
          this.activeTheme.next(AppTheme.DARK);
          //this.events.emit('titlebar-foregroundmode', TitleBarForegroundMode.LIGHT);
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
    let currentlyUsingDarkMode = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode");
    passwordManager.setDarkMode(currentlyUsingDarkMode);
    if (currentlyUsingDarkMode)
      this.activeTheme.next(AppTheme.DARK);
    else
      this.activeTheme.next(AppTheme.LIGHT);
  }

  public async toggleTheme() {
    await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode", this.activeTheme.value == AppTheme.DARK ? false : true);
  }

  // Convenient getter for backward compatibility from elastOS 1.x
  public get darkMode() {
    return this.activeTheme.value == AppTheme.DARK;
  }
}
