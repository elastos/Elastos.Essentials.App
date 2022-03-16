import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";
export class BTCSPVSDKSafe extends SPVSDKSafe {
  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    return await SPVService.instance.getLegacyAddresses(
      jsToSpvWalletId(this.masterWallet.id), 0, 1, false);
  }
}