import { Injectable } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { Subject } from 'rxjs';
import { App } from '../model/app.enum';
import { WalletInitService } from '../wallet/services/init.service';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { Direction, GlobalNavService } from './global.nav.service';
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
    private walletInitService: WalletInitService,
    private globalNav: GlobalNavService,
    private splashScreen: SplashScreen) {
  }

  /**
   * Navigates to the startup screen chosen by the user; By default, this is the launcher home screen
   * but this can be customized.
   */
  public async navigateToStartupScreen(): Promise<boolean> {
    let startupScreen = await this.getStartupScreen(GlobalDIDSessionsService.signedInDIDString);

    this.globalNav.clearNavigationHistory();

    switch (startupScreen) {
      case 'wallets':
        // Navigate to active wallet
        await this.walletInitService.start();
        break;
      case 'dapps':
        await this.globalNav.navigateRoot(App.DAPP_BROWSER, '/dappbrowser/home');
        break;
      case 'home':
      default:
        // Navigate to home screen
        return this.globalNav.navigateHome(Direction.NONE);
    }
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
