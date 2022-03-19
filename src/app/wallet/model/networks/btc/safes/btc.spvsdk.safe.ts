import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";
import { BTCSafe } from "./btc.safe";

export class BTCSPVSDKSafe extends SPVSDKSafe implements BTCSafe {
  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    return await SPVService.instance.getLegacyAddresses(
      jsToSpvWalletId(this.masterWallet.id), 0, 1, false);
  }

  public async createBTCPaymentTransaction(inputs: any, outputs: any, changeAddress: string, feePerKB: string): Promise<any> {
    return await SPVService.instance.createBTCTransaction(
      jsToSpvWalletId(this.masterWallet.id), JSON.stringify(inputs), JSON.stringify(outputs), changeAddress, feePerKB);
  }
}