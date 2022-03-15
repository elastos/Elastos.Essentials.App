import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";

export class BTCSPVSDKSafe extends SPVSDKSafe {
  // TODO: Get address by type.
  public async getAddress(): Promise<string> {
    let legacyAddresses = await SPVService.instance.getLegacyAddresses(
      jsToSpvWalletId(this.masterWallet.id), 0, 1, false);
    if (legacyAddresses) {
      return legacyAddresses[0];
    }
    return null;
  }
}