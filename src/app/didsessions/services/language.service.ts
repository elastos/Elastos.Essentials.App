import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

let selfLanguageService: LanguageService = null;

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  public languages = [
    {
      name: 'System Language',
      code: 'native system',
      icon: '/assets/countries/england.png',
    },
    {
      name: 'English',
      code: 'en',
      icon: '/assets/countries/england.png',
    },
    {
      name: 'Français',
      code: 'fr',
      icon: '/assets/countries/france.png',
    },
    {
      name: '中文（简体）',
      code: 'zh',
      icon: '/assets/countries/china.png',
    }
  ];

  public currentLang: string = null;
  public systemLang: string = null;
  public selectLang: string = null;

  private languageWasManuallyChangedByUser = false;

  constructor(
    private translate: TranslateService,
    private appManager: TemporaryAppManagerPlugin
  ) {
    selfLanguageService = this;
  }

  init() {
    for (var i = 1; i < this.languages.length; i++) {
      this.translate.addLangs([this.languages[i].code]);
    }

    this.translate.onLangChange.subscribe(data => {
      console.log("onLangChange");
      this.onLangChange(data.lang);
    });

    this.getLanguage();
  }

  getLanguage() {
    this.appManager.getLocale(
        (defaultLang, currentLang, systemLang) => {
            this.setSystemLang(systemLang);
            selfLanguageService.setSelectLang(currentLang, false);
        }
    );
  }

  onLangChange(code: string) {
    this.currentLang = this.translate.currentLang;
    this.setSystemLangName();
  }

  getLanguageName(code: string) {
    for (var i = 0; i < this.languages.length; i++) {
      if (this.languages[i].code === code) {
        return this.languages[i].name;
      }
    }
  }

  setDefaultLang(code: string) {
    if (this.selectLang === null) {
      this.selectLang = code;
    }

    if (this.translate.defaultLang !== code) {
      this.translate.setDefaultLang(code);
    }

    if (this.currentLang === null) {
      this.setCurrentLang(code);
    }
  }

  setSystemLangName() {
    this.languages[0].name = this.translate.instant("system_language");
    if (this.systemLang !== null) {
      this.languages[0].name += ": " + this.getLanguageName(this.systemLang);
    }
  }

  setSystemLang(code: string) {
    if (this.systemLang === null) {
      this.setSystemLangName();
    }
    this.systemLang = code;
  }

  setCurrentLang(code: string) {
    this.translate.use(code);
  }

  setSelectLang(code: string, isUserChange = true) {
    if (isUserChange) {
      this.languageWasManuallyChangedByUser = true;
      console.log("Language manually changed by user");
    }

    if (!code)
      code = "native system";

    if (this.selectLang !== code) {
      this.selectLang = code;
      console.log("Setting app manager locale to " + code);
      this.appManager.setCurrentLocale(code);
    }
    if (code === "native system") {
      code = this.systemLang;
    }
    console.log("Selected language code: "+code);
    this.setCurrentLang(code);
  }

  public languageWasChangedByUser() {
    return this.languageWasManuallyChangedByUser;
  }
}
