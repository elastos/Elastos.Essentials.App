import { Logger } from "src/app/logger";
import { DIDHelper } from "../helpers/did.helper";

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