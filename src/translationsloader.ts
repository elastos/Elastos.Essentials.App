import { Logger } from "./app/logger";

export class TranslationsLoader {
    public static async getTranslations(lang: string): Promise<{[key:string]:string}> {
      let languageToLoad: string = lang;

      Logger.log("translations", "Loading translations for language:", lang);

      let translations = await import("./assets/generated/translations/"+lang+".json");
      return Promise.resolve(translations);
    }
  }