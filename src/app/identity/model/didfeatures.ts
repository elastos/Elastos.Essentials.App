import { DIDHelper } from "src/app/helpers/did.helper";
import { Logger } from "src/app/logger";

declare let didManager: DIDPlugin.DIDManager;

export class DIDFeatures {
  public static enableJsonLdContext(enable: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      didManager.enableJsonLdContext(
        enable,
        resolve, (err) => {
          Logger.error('identity', "enableJsonLdContext exception", err);
          reject(DIDHelper.reworkedPluginException(err));
        },
      );
    });
  }
}