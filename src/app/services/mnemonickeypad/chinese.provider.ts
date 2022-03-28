import { AsciiMapping } from "./asciimapping";
import { MnemonicSuggestionProvider } from "./suggestionprovider";

export class ChineseMnemonicSuggestionProvider implements MnemonicSuggestionProvider {
  private mapping: AsciiMapping;
  private orderedKeys: string[];

  constructor() {
    void import("src/assets/components/mnemonic-keypad/simplified_chinese.json").then(mapping => {
      this.mapping = mapping.default as any as AsciiMapping;
      let keys = Object.keys(this.mapping);
      this.orderedKeys = keys.sort((a, b) => a.localeCompare(b));
    });
  }

  getSuggestions(letters: string): string[] {
    letters = letters.toLowerCase();

    let matchingKeys = this.orderedKeys.filter(key => key.startsWith(letters));
    return matchingKeys.reduce((acc, key) => [...acc, ...(this.mapping[key] || [])], [] as string[]).slice(0, 40);
  }
}