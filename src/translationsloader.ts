import { Logger } from "./app/logger";

export class TranslationsLoader {
    private static supportedLanguages = ['en', 'zh', 'fr'];

    public static async getTranslations(lang: string): Promise<{ [key: string]: string }> {
        // Fallback to english if the target language is not supported.
        if (TranslationsLoader.supportedLanguages.indexOf(lang) < 0) {
            Logger.log("translations", "Got request to switch language to "+lang+" but this language is not supported. Falling back to english");
            lang = "en";
        }

        Logger.log("translations", "Loading translations for language:", lang);

        let translations = await import("./assets/generated/translations/" + lang + ".json");
        return Promise.resolve(translations);
    }
}