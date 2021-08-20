import { Injectable } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { Subject } from 'rxjs';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalStorageService } from './global.storage.service';

/**
 * Service that handles user defined startup screen and related startup flow details.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalStartupService {
  constructor(
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private splashScreen: SplashScreen) {
  }

  /**
   * Startup screen is ready (visible), so we can finalize some operations such as hiding the splash screen
   */
  public setStartupScreenReady() {
    this.splashScreen.hide();
  }

  public getStartupScreen(did: string): Promise<string> {
    return this.prefs.getPreference<string>(did, "ui.startupscreen");
  }

  public setStartupScreen(did: string, screenKey: string): Promise<void> {
    return this.prefs.setPreference(did, "ui.startupscreen", screenKey);
  }
}
