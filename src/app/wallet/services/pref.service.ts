import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { NetworkType } from 'src/app/model/networktype';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Config } from '../config/Config';

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
        this.updateConfig(this.activeNetwork);
    });

    this.updateConfig(this.activeNetwork);

    this.setMnemonicLangByLanguage(this.translate.currentLang);
    this.languageSubscription = this.translate.onLangChange.subscribe(data => {
      this.setMnemonicLangByLanguage(data.lang);
    });
  }

  private updateConfig(netWork: NetworkType) {
    if (netWork === NetworkType.MainNet) {
      Config.ETHSC_ADDRESS = Config.ETHSC_ADDRESS_MAINNET;
      Config.ETHSC_CONTRACT_ADDRESS = Config.ETHSC_CONTRACT_ADDRESS_MAINNET;
    } else if (netWork === NetworkType.TestNet) {
      Config.ETHSC_ADDRESS = Config.ETHSC_ADDRESS_TESTNET;
      Config.ETHSC_CONTRACT_ADDRESS = Config.ETHSC_CONTRACT_ADDRESS_TESTNET;
    } else {
      // Use MainNet config for others.
      Config.ETHSC_ADDRESS = Config.ETHSC_ADDRESS_MAINNET;
      Config.ETHSC_CONTRACT_ADDRESS = Config.ETHSC_CONTRACT_ADDRESS_MAINNET;
    }
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

  public getNetworkType(): NetworkType {
    return this.activeNetwork;
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
