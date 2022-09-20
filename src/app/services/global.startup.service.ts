import { Injectable } from '@angular/core';
import { LottieSplashScreen } from '@awesome-cordova-plugins/lottie-splash-screen/ngx';
import { Logger } from '../logger';
import { App } from '../model/app.enum';
import { WalletInitService } from '../wallet/services/init.service';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { Direction, GlobalNavService } from './global.nav.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalSecurityService } from './global.security.service';
import { GlobalStorageService } from './global.storage.service';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';
import { GlobalThemeService } from './theming/global.theme.service';

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
    private globalSecurityService: GlobalSecurityService,
    private didSessions: GlobalDIDSessionsService,
    private theme: GlobalThemeService,
    private lottieSplashScreen: LottieSplashScreen) {
  }

  /**
   * Navigate to the right startup screen
   */
  public async navigateToFirstScreen(): Promise<void> {
    Logger.log("Global", "Navigating to start screen");

    // Warn user about the device being a rooted device if necessary
    if (!(await this.globalSecurityService.rootedDeviceWarningWasDismissed()) && (await this.globalSecurityService.isDeviceRooted())) {
      await this.globalNav.navigateTo(App.SECURITY, '/security/rootedwarning');
    }
    else {
      let entry = await this.didSessions.getSignedInIdentity();
      if (entry != null) {
        Logger.log("Global", "An active DID exists, navigating to startup screen");

        // Make sure to load the active user theme preference before entering the home screen
        // to avoid blinking from light to dark modes while theme is fetched from preferences
        await this.theme.fetchThemeFromPreferences();

        await this.navigateToStartupScreen();
      } else {
        Logger.log("Global", "No active DID, navigating to DID sessions");

        // Navigate to DID creation
        await this.globalNav.navigateTo("didsessions", '/didsessions/pickidentity');
        // await this.globalNav.navigateTo("didsessions", '/didsessions/chooseimporteddid');
      }
    }
  }

  /**
   * Navigates to the startup screen chosen by the user. By default, this is the launcher home screen
   * but this can be customized.
   */
  public async navigateToStartupScreen(): Promise<boolean> {
    let startupScreen = await this.getStartupScreen(DIDSessionsStore.signedInDIDString);

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
    this.lottieSplashScreen.hide();
  }

  public getStartupScreen(did: string): Promise<string> {
    return this.prefs.getPreference<string>(did, NetworkTemplateStore.networkTemplate, "ui.startupscreen");
  }

  public setStartupScreen(did: string, screenKey: string): Promise<void> {
    return this.prefs.setPreference(did, NetworkTemplateStore.networkTemplate, "ui.startupscreen", screenKey);
  }
}
