import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { NetworkType } from 'src/app/model/networktype';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';

@Injectable({
  providedIn: 'root'
})
export class WalletPrefsService {
  public activeNetwork: NetworkType;
  public mnemonicLang = 'english';
  private subscription: Subscription = null;
  private languageSubscription: Subscription = null;

  constructor(
    private globalPreferences: GlobalPreferencesService,
    public translate: TranslateService,
  ) {}

  public async init() {
    this.activeNetwork = await this.globalPreferences.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);

    this.subscription = this.globalPreferences.preferenceListener.subscribe((preference)=>{
      if (preference.key === "chain.network.type")
        this.activeNetwork = preference.value;
    });

    this.setMnemonicLangByLanguage(this.translate.currentLang);
    this.languageSubscription = this.translate.onLangChange.subscribe(data => {
      this.setMnemonicLangByLanguage(data.lang);
    });

  }

  private setMnemonicLangByLanguage(lang) {
    if (lang === 'zh') {
      this.setMnemonicLang("chinese");
    } else if (lang === 'fr') {
      this.setMnemonicLang("french");
    } else {
      this.setMnemonicLang("english");
    }
  }

  public getMnemonicLang(): string {
    return this.mnemonicLang;
  }

  public setMnemonicLang(lang) {
    this.mnemonicLang = lang;
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
      this.languageSubscription = null;
    }
  }
}
