import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { MnemonicKeypadComponent } from '../components/mnemonic-keypad/mnemonic-keypad.component';
import { GlobalThemeService } from './global.theme.service';
import { ChineseMnemonicSuggestionProvider } from './mnemonickeypad/chinese.provider';
import { EnglishMnemonicSuggestionProvider } from './mnemonickeypad/english.provider';
import { FrenchMnemonicSuggestionProvider } from './mnemonickeypad/french.provider';
import { ItalianMnemonicSuggestionProvider } from './mnemonickeypad/italian.provider';

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
    zh: new ChineseMnemonicSuggestionProvider(),
    it: new ItalianMnemonicSuggestionProvider()
  }
  private activeMnemonicModal: HTMLIonModalElement = null;

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
      { code: "fr", icon: "assets/components/mnemonic-keypad/icons/flags/france_200_120.png" },
      { code: "it", icon: "assets/components/mnemonic-keypad/icons/flags/italy_200_120.png" }
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
   * Resolves when the popup is closed (input ended, or cancelled)
   *
   * @param numberOfExpectedWords The keypad auto closes once user chose this number of words.
   */
  public promptMnemonic(numberOfExpectedWords: number, wordInputCb: (words: string[]) => void, pasteCb: (pasted: string) => void, modalShownCb?: () => void): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async resolve => {
      await this.dismissMnemonicPrompt();

      this.activeMnemonicModal = await this.modalCtrl.create({
        component: MnemonicKeypadComponent,
        componentProps: {},
        backdropDismiss: true, // Closeable
        showBackdrop: false,
        cssClass: !this.theme.darkMode ? "identity-showqrcode-component identity-publishmode-component-base" : 'identity-showqrcode-component-dark identity-publishmode-component-base'
      });

      let backContents = document.getElementsByTagName("ion-content");
      let justBehindScreenContent = backContents[backContents.length - 1];

      let wordsSub = this.typedMnemonicWords.subscribe(words => {
        wordInputCb(words);
        if (words && words.length === numberOfExpectedWords) {
          void this.dismissMnemonicPrompt();
        }
      });
      let pasteSub = this.pastedContent.subscribe(pasteCb);

      void this.activeMnemonicModal.onDidDismiss().then((params) => {
        // Restore background content original size
        justBehindScreenContent.style.cssText = "";

        wordsSub.unsubscribe();
        pasteSub.unsubscribe();

        resolve();
      });

      await this.activeMnemonicModal.present();

      // Reduce the main visible content area to go over the keypad and thus be scrollable
      justBehindScreenContent.style.cssText = "--padding-bottom : " + this.activeMnemonicModal.getElementsByTagName("ion-content")[0].clientHeight + "px !important";
      // Remove modal backdrop to make the background content user scrollable
      // On android and ios, <ion-backgrop> is at different positions in the shadow root container so
      // we have to search it.
      // Also, depending on different angular versions, shadow root is used or not.
      let children = this.activeMnemonicModal.shadowRoot ? this.activeMnemonicModal.shadowRoot.children : this.activeMnemonicModal.children;
      for (let i = 0; i < children.length; i++) {
        let c = children[i];
        if (c.tagName.toLowerCase() === "ion-backdrop") {
          c.remove();
          break;
        }
      }

      modalShownCb?.();
    });
  }

  public async dismissMnemonicPrompt(): Promise<void> {
    if (this.activeMnemonicModal)
      await this.activeMnemonicModal.dismiss();

    this.activeMnemonicModal = null;
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
