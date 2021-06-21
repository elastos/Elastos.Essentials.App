import { Logger } from "./app/logger";

export class TranslationsLoader {
    private static modulesWithTranslations = [
        "common",       // Shared strings for generic keywords such as cancel, open, add, etc.
        "contacts",
        'crcouncilvoting',
        'crcouncilmanager',
        'crproposalvoting',
        "developertools",
        "didsessions",
        "dposvoting",
        "dposregistration",
        "hivemanager",
        "identity",
        "launcher",
        "scanner",
        "settings",
        "wallet"
    ];
    private static languagesToLoad = [
        "en",
        "zh",
        "fr"
    ];

    private static loadedTranslations: {[lang:string]:any} = {};

    /**
     * Load all translations from all dapp translation files and merge them, as the translation service
     * doesn't seem to allow us to have isolated translations per module.
     */
    public static async loadAllModulesAndMerge(): Promise<void> {
        Logger.log("Translations", "Loading all translations");

        for (let lang of TranslationsLoader.languagesToLoad) {
            TranslationsLoader.loadedTranslations[lang] = {}
            for (let module of TranslationsLoader.modulesWithTranslations) {
                let translation = await import("./assets/translations/"+module+"/"+lang);

                // Copy all entries one by one and check if they don't already exist, to be able to notice duplicate
                // keys from various modules.
                for (let key of Object.keys(translation[lang])) {
                    let value = translation[lang][key];
                    if ((key in TranslationsLoader.loadedTranslations[lang])) {
                        if (TranslationsLoader.loadedTranslations[lang][key] == value)
                            console.warn("Duplicate translation key (same value)! For key:", key, "Imported by module:", module);
                        else
                            console.error("Duplicate translation key with different values! Fix this - Overwriting entry for key:", key, "Imported by module:", module);
                    }

                    TranslationsLoader.loadedTranslations[lang][key] = value;
                }
                //Object.assign(TranslationsLoader.loadedTranslations[lang], translation[lang]);
            }
        }
        Logger.log("Translations", "All translations have been loaded");
    }

    public static getTranslations(lang: string): {[key:string]:string} {
      let languageToLoad: string = lang;

      // Default language
      if (!(lang in TranslationsLoader.loadedTranslations))
        languageToLoad = "en";

      return TranslationsLoader.loadedTranslations[languageToLoad];
    }
  }