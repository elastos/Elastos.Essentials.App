import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { ModalController, NavParams } from '@ionic/angular';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalMnemonicKeypadService, MnemonicLanguage } from 'src/app/services/global.mnemonickeypad.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

type MnemonicKeypadComponentOptions = {
  restartWithWords: string[];
}

@Component({
  selector: 'app-mnemonic-keypad',
  templateUrl: './mnemonic-keypad.component.html',
  styleUrls: ['./mnemonic-keypad.component.scss'],
})
export class MnemonicKeypadComponent implements OnInit {
  // QWERTY keyboard mapping
  public inputLetters = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  // Inputs
  public options: MnemonicKeypadComponentOptions = null;

  // UI model
  public onGoingInput = ""; // Sequence of letters currently been typed
  public suggestedWords: string[] = [];
  public languages: MnemonicLanguage[] = [];
  public selectedLanguage = "en";
  public selectedWords: string[] = [];

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    private mnemonicKeypadService: GlobalMnemonicKeypadService,
    public languageService: GlobalLanguageService,
    private clipboard: Clipboard
  ) { }

  ngOnInit(): void {
    this.options = this.navParams.data as MnemonicKeypadComponentOptions || {
      restartWithWords: []
    };

    this.languages = this.mnemonicKeypadService.getSupportedLanguages();
    this.selectedWords = this.options.restartWithWords;

    // Auto-select language based on app language
    let appLanguage = this.languageService.activeLanguage.value;
    if (this.mnemonicKeypadService.getSupportedLanguageCodes().indexOf(appLanguage) >= 0)
      this.selectedLanguage = appLanguage;
    else
      this.selectedLanguage = "en"; // Fallback to english
  }

  ionViewWillEnter() {
  }

  public onLetterTyped(letter: string) {
    this.onGoingInput += letter;
    this.updateSuggestedWords();
  }

  public clearCurrentInput() {
    this.onGoingInput = "";
    this.updateSuggestedWords();
  }

  private updateSuggestedWords() {
    this.suggestedWords = this.mnemonicKeypadService.getSuggestedMnemonicWords(this.selectedLanguage, this.onGoingInput);
  }

  public onWordSelected(word: string) {
    this.selectedWords.push(word);
    this.mnemonicKeypadService.typedMnemonicWords.next(this.selectedWords);
    this.onGoingInput = "";
    this.updateSuggestedWords();
  }

  public selectLanguage(lang: MnemonicLanguage) {
    this.selectedLanguage = lang.code;
    this.onGoingInput = "";

    // Reset all words
    this.selectedWords = [];
    this.mnemonicKeypadService.typedMnemonicWords.next(this.selectedWords);

    this.updateSuggestedWords();
  }

  public closeKeypad() {
    void this.modalCtrl.dismiss(true);
  }

  public async pasteClipboard() {
    let clipboardContent = await this.clipboard.paste();
    this.mnemonicKeypadService.pastedContent.next(clipboardContent);
    this.closeKeypad();
  }

  /**
   * Deletes the previous word previously validated.
   */
  public deletePreviousWord() {
    this.selectedWords.pop();
    this.mnemonicKeypadService.typedMnemonicWords.next(this.selectedWords);
  }
}
