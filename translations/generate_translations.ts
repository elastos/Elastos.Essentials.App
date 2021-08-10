import { existsSync, mkdirSync, writeFileSync } from "fs";

class TranslationsLoader {
    static modulesWithTranslations = [
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
    static languagesToLoad = [
        "en",
        "zh",
        "fr"
    ];

    static loadedTranslations : {[lang:string]:any} = {};
    static translationKeyCount: number;

    /**
     * Load all translations from all dapp translation files and merge them, as the translation service
     * doesn't seem to allow us to have isolated translations per module.
     */
    static async loadAllModulesAndMerge() {
        console.log("Loading all translations");

        let translationsDir = __dirname+"/../src/assets/generated/translations";
        if(!existsSync(translationsDir))
            mkdirSync(translationsDir, { recursive: true });

        this.translationKeyCount = 0;
        for (let lang of TranslationsLoader.languagesToLoad) {
            TranslationsLoader.loadedTranslations[lang] = {}
            for (let module of TranslationsLoader.modulesWithTranslations) {
                let translation = await import("./strings/"+module+"/"+lang);

                TranslationsLoader.loadedTranslations[lang][module] = {};

                // Copy all entries one by one and check if they don't already exist, to be able to notice duplicate
                // keys from various modules.
                //
                // Translation files format: module/en.ts -> { module: {'key': 'value' ...} }
                for (let key of Object.keys(translation[lang][module])) {
                    let value = translation[lang][module][key];
                    if ((key in TranslationsLoader.loadedTranslations[lang][module])) {
                        if (TranslationsLoader.loadedTranslations[lang][key] == value)
                            console.warn("Duplicate translation key (same value)! For key:", key, "Imported by module:", module);
                        else
                            console.error("Duplicate translation key with different values! Fix this - Overwriting entry for key:", key, "Imported by module:", module);
                    }

                    TranslationsLoader.loadedTranslations[lang][module][key] = value;
                    this.translationKeyCount ++;
                }
                //Object.assign(TranslationsLoader.loadedTranslations[lang], translation[lang]);
            }

            writeFileSync(translationsDir+"/"+lang+".json", JSON.stringify(TranslationsLoader.loadedTranslations[lang]));
        }

        console.log("All translations have been loaded. Stats:");
        console.log("   App modules: ", this.modulesWithTranslations.length);
        console.log("   Languages  : ", this.languagesToLoad.length);
        console.log("   Strings    : ", this.translationKeyCount);
    }
  }

TranslationsLoader.loadAllModulesAndMerge();