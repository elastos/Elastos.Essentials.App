import { AsciiMapping } from "./asciimapping";
import { MnemonicSuggestionProvider } from "./suggestionprovider";

export class FrenchMnemonicSuggestionProvider implements MnemonicSuggestionProvider {
  private mapping: AsciiMapping;

  constructor() {
    void import("src/assets/components/mnemonic-keypad/french.json").then(mapping => {
      this.mapping = mapping as any as AsciiMapping;
    });
  }

  getSuggestions(letters: string): string[] {
    letters = letters.toLowerCase();

    let matchingKeys = Object.keys(this.mapping).filter(key => key.startsWith(letters));
    return matchingKeys.reduce((acc, key) => [...acc, ...(this.mapping[key] || [])], [] as string[]).slice(0, 6);
  }
}