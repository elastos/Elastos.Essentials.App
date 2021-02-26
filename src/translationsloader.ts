export class TranslationsLoader {
    private static modulesWithTranslations = [
        "launcher",
        "didsessions",
        "hivemanager",
        "scanner",
        "settings"
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
        console.log("Loading all translations");

        for (let lang of TranslationsLoader.languagesToLoad) {
            TranslationsLoader.loadedTranslations[lang] = {}
            for (let module of TranslationsLoader.modulesWithTranslations) {
                let translation = await import("./assets/translations/"+module+"/"+lang);

                // Copy all entries oen by one and check if they don't already exist, to be able to notice duplicate
                // keys from various modules.
                for (let key of Object.keys(translation[lang])) {
                    let value = translation[lang][key];
                    if ((key in TranslationsLoader.loadedTranslations[lang]))
                        console.error("Duplicate translation key! Fix this - Overwriting entry for key:", key);

                    TranslationsLoader.loadedTranslations[lang][key] = value;
                }
                //Object.assign(TranslationsLoader.loadedTranslations[lang], translation[lang]);
            }
        }
        console.log("All translations have been loaded");
    }

    public static getTranslations(lang: string): {[key:string]:string} {
      let languageToLoad: string = lang;

      // Default language
      if (!(lang in TranslationsLoader.loadedTranslations))
        languageToLoad = "en";

      return TranslationsLoader.loadedTranslations[languageToLoad];
    }
  }