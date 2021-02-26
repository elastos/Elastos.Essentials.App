import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './storage.service';

declare let appManager: AppManagerPlugin.AppManager;

let selfLanguageService: LanguageService = null;

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

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

  public currentLang: string = null;
  public systemLang: string = null;
  public selectLang: string = null;

  constructor(
    private translate: TranslateService,
    private storage: StorageService
  ) {
    selfLanguageService = this;
  }

  async init() {
    for (var i = 1; i < this.languages.length; i++) {
      this.translate.addLangs([this.languages[i].code]);
    }

    this.translate.onLangChange.subscribe(data => {
      console.log("onLangChange");
      this.onLangChange(data.lang);
    });

    await this.getLanguage();
  }
  async getLanguage() {
    return new Promise<void>((resolve) => {
        appManager.getLocale((
            defaultLang: string, currentLang: string, systemLang: string
        ) => {
            this.setSystemLang(systemLang);
            selfLanguageService.setSelectLang(currentLang);
            resolve();
        });
    });
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

  setSelectLang(code: string) {
    if (!code)
      code = "native system";

    if (this.selectLang !== code) {
      this.selectLang = code;
      this.storage.setLang(this.selectLang);
      console.log("Setting app manager locale to " + code);
      appManager.setCurrentLocale(code, () => {
      }, (err)=>{
          console.error("setSelectLang() setCurrentLocale() error:", err)
      });
    }
    if (code === "native system") {
      code = this.systemLang;
    }
    this.setCurrentLang(code);
  }
}
