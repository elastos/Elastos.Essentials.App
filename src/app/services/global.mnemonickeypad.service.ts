import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { MnemonicKeypadComponent } from '../components/mnemonic-keypad/mnemonic-keypad.component';
import { GlobalThemeService } from './global.theme.service';
import { ChineseMnemonicSuggestionProvider } from './mnemonickeypad/chinese.provider';
import { EnglishMnemonicSuggestionProvider } from './mnemonickeypad/english.provider';
import { FrenchMnemonicSuggestionProvider } from './mnemonickeypad/french.provider';

export type Preference<T> = {
  key: string;
  value: T;
}

export type MnemonicLanguage = {
  code: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalMnemonicKeypadService {
  public static instance: GlobalMnemonicKeypadService;  // Convenient way to get this service from non-injected classes

  private suggestionProviders = {
    en: new EnglishMnemonicSuggestionProvider(),
    fr: new FrenchMnemonicSuggestionProvider(),
    zh: new ChineseMnemonicSuggestionProvider()
  }

  /** List of mnemonic words typed by the user during a single keypad session (open/close) */
  public typedMnemonicWords: Subject<string[]> = new Subject();
  /** Clipboard content pasted from the clipboard dialog */
  public pastedContent: Subject<string> = new Subject();

  constructor(private theme: GlobalThemeService, private modalCtrl: ModalController) {
    GlobalMnemonicKeypadService.instance = this;
  }

  public getSupportedLanguages(): MnemonicLanguage[] {
    return [
      { code: "en", icon: "assets/components/mnemonic-keypad/icons/flags/england_200_120.png" },
      { code: "zh", icon: "assets/components/mnemonic-keypad/icons/flags/china_200_120.png" },
      { code: "fr", icon: "assets/components/mnemonic-keypad/icons/flags/france_200_120.png" }
    ];
  }

  /**
   * List of languages codes supported for mnemonic input.
   */
  public getSupportedLanguageCodes(): string[] {
    return this.getSupportedLanguages().map(l => l.code);
  }

  /**
   * Display the special mnemonic keypad that lets users enter their mnemonic words without
   * typing them in the system keyboard (that could leak words somehow).
   *
   * Subscribe to the typedMnemonicWords subject to get typed words.
   *
   * @param numberOfExpectedWords The keypad auto closes once user chose this number of words.
   */
  public promptMnemonic(numberOfExpectedWords: number): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise<string | null>(async resolve => {
      const modal = await this.modalCtrl.create({
        component: MnemonicKeypadComponent,
        componentProps: {},
        backdropDismiss: true, // Closeable
        cssClass: !this.theme.darkMode ? "identity-showqrcode-component identity-publishmode-component-base" : 'identity-showqrcode-component-dark identity-publishmode-component-base'
      });

      void modal.onDidDismiss().then((params) => {
        //
      });

      void modal.present();
    });
  }

  /**
   * From a given sequence of typed letters (letters), finds suggestions in existing BIP39
   * word lists.
   */
  public getSuggestedMnemonicWords(lang: string, letters: string): string[] {
    if (!letters)
      return [];

    return this.suggestionProviders[lang].getSuggestions(letters);
  }
}
