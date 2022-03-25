import { MnemonicSuggestionProvider } from "./suggestionprovider";

export class ItalianMnemonicSuggestionProvider implements MnemonicSuggestionProvider {
  private words: string[];

  constructor() {
    void import("bip39/src/wordlists/italian.json").then(words => {
      this.words = Array.from(words);
    });
  }

  getSuggestions(letters: string): string[] {
    letters = letters.toLowerCase();
    return this.words.filter(word => word.startsWith(letters)).slice(0, 6);
  }
}