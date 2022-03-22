
export interface MnemonicSuggestionProvider {
  getSuggestions(letters: string): string[];
}