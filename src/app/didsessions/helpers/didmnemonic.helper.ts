
declare let didManager: DIDPlugin.DIDManager;

export class DIDMnemonicHelper {
    // Languages supported by did plugin.
    static MNEMONICLANGUAGE = ["CHINESE_SIMPLIFIED", "CHINESE_TRADITIONAL", "ENGLISH", "FRENCH", "SPANISH", "JAPANESE"];

    constructor() {
    }

    /**
     * @param inputMnemonic
     * @return
     */
    static async getMnemonicLanguage(inputMnemonic:string): Promise<DIDPlugin.MnemonicLanguage> {
        var len = DIDMnemonicHelper.MNEMONICLANGUAGE.length
        for (var i = 0; i < len; i++) {
          let language = DIDMnemonicHelper.MNEMONICLANGUAGE[i];
          let valid = await this.isMnemonicValid(language, inputMnemonic);
          if (valid) return language as DIDPlugin.MnemonicLanguage;
        }
        return null;
    }

    static isMnemonicValid(language, mnemonic): Promise<any> {
      return new Promise((resolve, reject)=>{
          didManager.isMnemonicValid(
              language, mnemonic,
              (ret) => {
                  resolve(ret)
              },
              (err) => {
                resolve(false)
              },
          );
      });
  }
}