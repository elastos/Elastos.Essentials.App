import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';
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
    private prefs: GlobalPreferencesService,
    private platform: Platform
  ) {
    super();

    void this.platform.ready().then(() => {
      // Default theme is dark.
      void passwordManager.setDarkMode(true);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.prefs.preferenceListener.subscribe((prefChanged) => {
      if (prefChanged.key == "ui.darkmode") {
        let darkMode = prefChanged.value as boolean;
        void this.updateTheme(darkMode);
      }
    });
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Re-apply the theme for the active user.
    await this.fetchThemeFromPreferences();
  }

  public async onUserSignOut(): Promise<void> {
    // Default mode for password popups: dark
    await passwordManager.setDarkMode(true);
    this.activeTheme.next(AppTheme.DARK);
  }

  public async fetchThemeFromPreferences() {
    let useDarkMode: boolean;

    // If no theme preference is set for the user, we use the currently active theme.
    // During identity creation, user may have changed the theme in DID Sessions, so we want to save this
    // info to the newly created DID context.
    if (!await this.prefs.preferenceIsSet(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode")) {
      useDarkMode = (this.activeTheme.value === AppTheme.DARK);
      // Save the preference
      await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode", useDarkMode);
    }
    else {
      useDarkMode = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode");
    }

    void passwordManager.setDarkMode(useDarkMode);
    Logger.log("theme", "Emitting active theme (fetch prefs) to value:", (useDarkMode?"dark":"light"));
    if (useDarkMode)
      this.activeTheme.next(AppTheme.DARK);
    else
      this.activeTheme.next(AppTheme.LIGHT);
  }

  /**
   * This method changes the current theme mode. Usually, a user is signed in so we change the dark mode settings
   * and we react on the preference change event to update the theme.
   * But we also want to allow DID Sessions to toggle theme while no user is signed in. In this case we change the
   * theme directly without saving any preference.
   */
  public async toggleTheme() {
    if (GlobalDIDSessionsService.signedInDIDString) {
      // A user is signed in, update his preferences
      await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "ui.darkmode", this.activeTheme.value == AppTheme.DARK ? false : true);
    }
    else {
      // No signed in user, directly change the theme.
      await this.updateTheme(!this.activeTheme.value);
    }
  }

  private async updateTheme(darkMode: boolean): Promise<void> {
    await passwordManager.setDarkMode(darkMode);

    Logger.log("theme", "Emitting active theme (update theme) to value:", (darkMode?"dark":"light"));
    if (darkMode)
      this.activeTheme.next(AppTheme.DARK);
      //this.events.emit('titlebar-foregroundmode', TitleBarForegroundMode.LIGHT);
    else
      this.activeTheme.next(AppTheme.LIGHT);
  }

  public get darkMode() {
    return this.activeTheme.value == AppTheme.DARK;
  }
}
