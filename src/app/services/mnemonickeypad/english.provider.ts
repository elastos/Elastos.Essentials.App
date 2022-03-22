import { MnemonicSuggestionProvider } from "./suggestionprovider";

export class EnglishMnemonicSuggestionProvider implements MnemonicSuggestionProvider {
  private words: string[];

  constructor() {
    void import("bip39/src/wordlists/english.json").then(words => {
      this.words = Array.from(words);
    });
  }

  getSuggestions(letters: string): string[] {
    letters = letters.toLowerCase();
    return this.words.filter(word => word.startsWith(letters)).slice(0, 6);
  }
}