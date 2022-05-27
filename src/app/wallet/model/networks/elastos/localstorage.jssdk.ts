import type { WalletStorage } from "@elastosfoundation/wallet-js-sdk";
import { LocalStoreInfo } from "@elastosfoundation/wallet-js-sdk/typings/persistence/LocalStore";
import { JSONObject } from "@elastosfoundation/wallet-js-sdk/typings/types";
import { GlobalStorageService } from "src/app/services/global.storage.service";

/**
 * Custom Elastos wallet JS SDK storage to sandbox wallet storages by DID.
 */
export class JSSDKLocalStorage implements WalletStorage {
  constructor(private signedInDID: string) { }

  loadStore(masterWalletID: string): Promise<LocalStoreInfo> {
    return GlobalStorageService.instance.getSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID, null);
  }

  removeStore(masterWalletID: string): Promise<void> {
    return GlobalStorageService.instance.deleteSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID);
  }

  public async saveStore(masterWalletID: string, j: JSONObject): Promise<void> {
    let storeIDs = await this.getMasterWalletIDs();
    if (!storeIDs.includes(masterWalletID)) {
      storeIDs.push(masterWalletID);
      await this.saveMasterWalletIDs(storeIDs);
    }

    return GlobalStorageService.instance.setSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID, j);
  }

  public getMasterWalletIDs(): Promise<string[]> {
    return GlobalStorageService.instance.getSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-stores", []);
  }

  private saveMasterWalletIDs(walletIDs: string[]): Promise<void> {
    return GlobalStorageService.instance.setSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-stores", walletIDs);
  }
}