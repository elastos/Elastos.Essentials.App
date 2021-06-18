import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AppmanagerService } from '../launcher/services/appmanager.service';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { Event } from '@angular/router';
import { TitleBarForegroundMode } from '../components/titlebar/titlebar.types';
import { GlobalService, GlobalServiceManager } from './global.service.manager';

export enum AppTheme {
  LIGHT,
  DARK
}

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalThemeService extends GlobalService {
  public activeTheme = new BehaviorSubject<AppTheme>(AppTheme.DARK);

  constructor(
    private platform: Platform,
    private prefs: GlobalPreferencesService,
    private didSessions: GlobalDIDSessionsService,
  ) {
    super();

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

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Re-apply the theme for the active user.
    this.fetchThemeFromPreferences();
  }

  public async onUserSignOut(): Promise<void> {
    // Default mode for password popups: light
    passwordManager.setDarkMode(false);
  }

  public async fetchThemeFromPreferences() {
    // Let's initialize the backup service asynchronously without blocking the UI
    // TODO @chad: why is ths backup service initialized from the theme service ?
    // TODO @chad: this is launcher's backup service. Move to launcher folder and initialize in a better location
    // this.backupService.init();

    const currentlyUsingDarkMode = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode");
    passwordManager.setDarkMode(currentlyUsingDarkMode);
    if (currentlyUsingDarkMode)
      this.activeTheme.next(AppTheme.DARK);
    else
      this.activeTheme.next(AppTheme.LIGHT);
  }

  public async toggleTheme() {
    await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode", this.activeTheme.value == AppTheme.DARK ? false : true);
  }

  public get darkMode() {
    return this.activeTheme.value == AppTheme.DARK;
  }
}
