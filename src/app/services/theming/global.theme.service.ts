import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { IdentityEntry } from '../../model/didsessions/identityentry';
import { GlobalPreferencesService } from '../global.preferences.service';
import { GlobalService, GlobalServiceManager } from '../global.service.manager';
import { DIDSessionsStore } from '../stores/didsessions.store';
import { NetworkTemplateStore } from '../stores/networktemplate.store';
import { ThemeConfig } from './theme';
import { availableThemes } from './themes';

export enum GlobalThemeMode {
  LIGHT,
  DARK
}

export type ActiveTheming = {
  config: ThemeConfig;
  variant: 'light' | 'dark';
};

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalThemeService extends GlobalService {
  public activeTheme = new BehaviorSubject<ActiveTheming>({
    config: this.defaultThemeConfig().theme,
    variant: this.defaultThemeConfig().themeVariant
  });

  constructor(
    private prefs: GlobalPreferencesService,
    private platform: Platform,
    private translate: TranslateService
  ) {
    super();

    void this.platform.ready().then(() => {
      // Default theme is dark.
      void passwordManager.setDarkMode(true);
    });
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);

    // Apply a default theme, when no user is signed in
    void this.applyThemeConfig(this.activeTheme.value.config, this.activeTheme.value.variant);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Re-apply the theme for the active user.
    await this.fetchThemeFromPreferences();
  }

  public async onUserSignOut(): Promise<void> {
    let { theme, themeVariant } = this.defaultThemeConfig();
    await this.applyThemeConfig(theme, themeVariant);
  }

  public async fetchThemeFromPreferences() {
    let themeKey = await this.prefs.getPreference(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'ui.theme'
    );
    let themeConfig = availableThemes.find(theme => theme.key === themeKey);

    let themeVariant = await this.prefs.getPreference(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'ui.variant'
    );

    await this.applyThemeConfig(themeConfig, themeVariant);
  }

  public get darkMode() {
    return this.activeTheme.value.config.usesDarkMode;
  }

  public getAvailableThemeConfigs(): ThemeConfig[] {
    return availableThemes;
  }

  private defaultThemeConfig(): { theme: ThemeConfig; themeVariant: 'light' | 'dark' } {
    let blackTheme = availableThemes.find(theme => theme.key === 'white');
    return { theme: blackTheme, themeVariant: 'light' };
  }

  /**
   * Applies a theme without persisting
   */
  async applyThemeConfig(theme: ThemeConfig, themeVariant: 'light' | 'dark') {
    let variant = theme.variants[themeVariant];

    // mainTextColor format must be #RRGGBB
    let mainTextColor: string = null;
    if (theme.usesDarkMode) {
      mainTextColor = variant.textColor || '#FFFFFF';
    } else {
      mainTextColor = variant.textColor || '#000000';
    }

    document.body.style.setProperty(
      '--essentials-box-color',
      variant.boxColor || (themeVariant === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
    );
    document.body.style.setProperty('--essentials-border-separator-color', `${mainTextColor}30`); // Semi transparent based on text color
    document.body.style.setProperty('--essentials-pagination-color', `${mainTextColor}B0`); // Semi transparent based on text color
    document.body.style.setProperty('--essentials-pagination-active-color', `${mainTextColor}`);
    document.body.style.setProperty(
      '--essentials-button-background-color',
      variant.buttonBackgroundColor || mainTextColor
    );
    document.body.style.setProperty('--essentials-button-text-color', variant.buttonTextColor || variant.color);

    // Set ionic background color and variants
    document.body.style.setProperty('--ion-text-color', mainTextColor);
    document.body.style.setProperty('--ion-color-primary', mainTextColor);
    document.body.style.setProperty('--ion-card-color', mainTextColor);
    document.body.style.setProperty('--ion-item-color', mainTextColor);
    document.body.style.setProperty('--ion-background-color', variant.color);
    document.body.style.setProperty('--ion-item-background', variant.color);
    document.body.style.setProperty('--ion-item-border-color', `${mainTextColor}30`); // Semi transparent based on text color
    document.body.style.setProperty('--ion-color-step-50', variant.color);
    document.body.style.setProperty('--ion-color-step-100', variant.color);
    document.body.style.setProperty('--ion-color-step-150', variant.color);
    document.body.style.setProperty('--ion-color-step-200', variant.color);
    document.body.style.setProperty('--ion-color-step-250', variant.color);
    // Are other needed up to 950 ?

    await passwordManager.setDarkMode(theme.usesDarkMode);

    // Notify
    this.activeTheme.next({
      config: theme,
      variant: themeVariant
    });
  }

  /**
   * Applies a new theme and make it persisting
   */
  public async setThemeConfig(theme: ThemeConfig) {
    let themeVariant = this.activeTheme.value.variant;

    // Persist
    await this.prefs.setPreference(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'ui.theme',
      theme.key
    );

    // Apply
    void this.applyThemeConfig(theme, themeVariant);
  }

  private async setThemeVariant(themeVariant: 'light' | 'dark') {
    let theme = this.activeTheme.value.config;

    // Persist
    await this.prefs.setPreference(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'ui.variant',
      themeVariant
    );

    // Apply
    void this.applyThemeConfig(theme, themeVariant);
  }

  public async toggleThemeVariant() {
    await this.setThemeVariant(this.activeTheme.value.variant === 'light' ? 'dark' : 'light');
  }

  public getThemeTitle(theme: ThemeConfig): string {
    return this.translate.instant('launcher.theme-name-' + theme.key);
  }
}
