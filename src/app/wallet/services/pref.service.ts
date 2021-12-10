import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { GlobalNetworksService, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { Config } from '../config/Config';

@Injectable({
  providedIn: 'root'
})
export class WalletPrefsService {
  public activeNetworkTemplate: string;
  public mnemonicLang = WalletPlugin.MnemonicLanguage.English;
  private subscription: Subscription = null;
  private languageSubscription: Subscription = null;

  constructor(
    private globalNetworksService: GlobalNetworksService,
    public translate: TranslateService,
  ) {}

  public async init() {
    this.activeNetworkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();

    this.subscription = this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
      this.activeNetworkTemplate = template;
      this.updateConfig(this.activeNetworkTemplate);
    })

    this.setMnemonicLangByLanguage(this.translate.currentLang);
    this.languageSubscription = this.translate.onLangChange.subscribe(data => {
      this.setMnemonicLangByLanguage(data.lang);
    });
  }

  private updateConfig(networkTemplate: string) {
    switch (networkTemplate) {
      case TESTNET_TEMPLATE:
        Config.ETHDID_DEPOSIT_ADDRESS = Config.ETHDID_DEPOSIT_ADDRESS_TESTNET;
        Config.ETHDID_WITHDRAW_ADDRESS = Config.ETHDID_WITHDRAW_ADDRESS_TESTNET;
        Config.ETHDID_CONTRACT_ADDRESS = Config.ETHDID_CONTRACT_ADDRESS_TESTNET;
        Config.ETHSC_DEPOSIT_ADDRESS = Config.ETHSC_DEPOSIT_ADDRESS_TESTNET;
        Config.ETHSC_WITHDRAW_ADDRESS = Config.ETHSC_WITHDRAW_ADDRESS_TESTNET;
      break;
      case "LRW":
        Config.ETHDID_DEPOSIT_ADDRESS = Config.ETHDID_DEPOSIT_ADDRESS_LRW;
        Config.ETHDID_WITHDRAW_ADDRESS = Config.ETHDID_WITHDRAW_ADDRESS_LRW;
        Config.ETHDID_CONTRACT_ADDRESS = Config.ETHDID_CONTRACT_ADDRESS_LRW;
        // No ETHSC on LRW
        Config.ETHSC_DEPOSIT_ADDRESS = Config.ETHSC_DEPOSIT_ADDRESS_MAINNET;
        Config.ETHSC_WITHDRAW_ADDRESS = Config.ETHSC_WITHDRAW_ADDRESS_MAINNET;
      break;
      // case MAINNET_TEMPLATE:
      default:
        // MainNet config
        Config.ETHDID_DEPOSIT_ADDRESS = Config.ETHDID_DEPOSIT_ADDRESS_MAINNET;
        Config.ETHDID_WITHDRAW_ADDRESS = Config.ETHDID_WITHDRAW_ADDRESS_MAINNET;
        Config.ETHDID_CONTRACT_ADDRESS = Config.ETHDID_CONTRACT_ADDRESS_MAINNET;
        Config.ETHSC_DEPOSIT_ADDRESS = Config.ETHSC_DEPOSIT_ADDRESS_MAINNET;
        Config.ETHSC_WITHDRAW_ADDRESS = Config.ETHSC_WITHDRAW_ADDRESS_MAINNET;
      break;
    }
  }

  private setMnemonicLangByLanguage(lang) {
    if (lang === 'zh') {
      this.setMnemonicLang(WalletPlugin.MnemonicLanguage.ChineseSimplified);
    } else if (lang === 'fr') {
      this.setMnemonicLang(WalletPlugin.MnemonicLanguage.French);
    } else if (lang === 'it') {
      this.setMnemonicLang(WalletPlugin.MnemonicLanguage.Italian);
    } else {
      this.setMnemonicLang(WalletPlugin.MnemonicLanguage.English);
    }
  }

  public getMnemonicLang(): string {
    return this.mnemonicLang;
  }

  public setMnemonicLang(lang) {
    this.mnemonicLang = lang;
  }

  public getNetworkTemplate(): string {
    return this.activeNetworkTemplate;
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
