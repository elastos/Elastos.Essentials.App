import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalLanguageService extends GlobalService {
  public static instance: GlobalLanguageService = null;

  public languages = [
    {
      name: 'System Language',
      code: 'native system',
      icon: '/assets/icon/light_mode/language-icon.svg',
      icon2: '/assets/icon/dark_mode/language-icon.svg'
    },
    {
      name: 'English',
      code: 'en',
      icon: '/assets/icon/english.jpg',
    },
    {
      name: 'Français',
      code: 'fr',
      icon: '/assets/icon/french.jpg',
    },
    {
      name: '中文（简体）',
      code: 'zh',
      icon: '/assets/icon/chinese.png',
    },
    /*{
      name: 'Deutsche',
      code: 'de',
      icon: '/assets/icon/german.png',
    }*/
  ];

  private systemLanguage: string = null;
  public selectedLanguage: string = null;

  public activeLanguage = new BehaviorSubject<string>("en"); // Default: english

  constructor(
    private translationService: TranslateService,
    private prefs: GlobalPreferencesService) {
      super();
      GlobalLanguageService.instance = this;
  }

  public async init() {
    GlobalServiceManager.getInstance().registerService(this);

    this.setupAvailableLanguages();

    this.prefs.preferenceListener.subscribe((prefChanged)=>{
      if (prefChanged.key == "locale.language") {
        let lang = prefChanged.value as string;
        this.activeLanguage.next(lang);
      }
    });

    // We must get the default language when user does not sign in.
    await this.fetchLanguageInfo();
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.fetchLanguageInfo();
  }

  public onUserSignOut(): Promise<void> {
    this.selectedLanguage = null;
    // Reset language.
    this.setAppLanguage(this.systemLanguage);
    return;
  }

  /**
   * Register languages that the ionic translate module can use.
   */
  private setupAvailableLanguages() {
    for (var i = 1; i < this.languages.length; i++) {
      this.translationService.addLangs([this.languages[i].code]);
    }
  }

  /**
   * Set language for all modules
   */
  private setAppLanguage(language: string) {
    if (language === 'zh') {
        moment.locale('zh-cn');
    } else {
        moment.locale(language);
    }
    // Set language for the ionic translate module that does the actual screen items translations
    this.translationService.setDefaultLang(language);
    this.translationService.use(language);

    void passwordManager.setLanguage(language);
  }

  /**
   * Retrieves and stores system language, and current user-defined language.
   */
  async fetchLanguageInfo(): Promise<void> {
    Logger.log("LanguageService", "Fetching language information");

    this.systemLanguage = this.translationService.getBrowserLang();
    if (GlobalDIDSessionsService.signedInDIDString) {
      let languageFromPref: string = await this.prefs.getPreference(GlobalDIDSessionsService.signedInDIDString, "locale.language");
      if (!languageFromPref || languageFromPref == "native system") {
        // Use the language that the user selected in didsession.
        if (this.selectedLanguage) {
          await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "locale.language", this.selectedLanguage, true);
        }
      } else {
        this.selectedLanguage = languageFromPref;
      }
    }
    else {
      this.selectedLanguage = 'native system';
    }

    Logger.log("LanguageService", "System language:", this.systemLanguage, "Selected language:", this.selectedLanguage);

    let actualLanguage = this.userNotDefinedLanguageInUse() ? this.systemLanguage : this.selectedLanguage;
    this.setAppLanguage(actualLanguage);

    this.activeLanguage.next(actualLanguage);
  }

  /**
   * Tells whether the current language is a language defined by the user, or the default system one.
   */
  public userNotDefinedLanguageInUse(): boolean {
    return !this.selectedLanguage || this.selectedLanguage == "native system";
  }

  /**
   * Resets the user defined language and revert active language back to system default language.
   */
  public clearSelectedLanguage(): Promise<void> {
    return this.setSelectedLanguage(null);
  }

  /**
   * Sets a user-defined language for the whole application.
   * Pass null to restore to the default system language.
   */
  public async setSelectedLanguage(code: string | null) {
    if (!code)
      code = "native system";

    if (this.selectedLanguage !== code) {
      this.selectedLanguage = code;
    }
    if (code === "native system") {
      code = this.systemLanguage;
    }

    this.setAppLanguage(code);

    // Save current choice to disk
    Logger.log('LanguageService', "Saving global language code:", code);
    await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "locale.language", code, true);

    // Notify listeners of language changes
    this.activeLanguage.next(code);
  }

  /**
   * Returns the user friendly display language name for the given language code.
   * The returned language name is in its own language for each language (en->english, fr->français).
   */
  public getLanguageName(code: string) {
    for (var i = 0; i < this.languages.length; i++) {
      if (this.languages[i].code === code) {
        return this.languages[i].name;
      }
    }
  }

  public translate(key: string | string[], interpolateParams?: unknown): string {
    return this.translationService.instant.apply(this.translationService, [key, interpolateParams]);
  }
}
