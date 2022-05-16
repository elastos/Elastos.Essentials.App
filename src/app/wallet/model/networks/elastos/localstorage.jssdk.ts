import type { WalletStorage } from "@elastosfoundation/wallet-js-sdk";
import { JSONObject } from "@elastosfoundation/wallet-js-sdk/typings/types";
import { GlobalStorageService } from "src/app/services/global.storage.service";

/**
 * Custom Elastos wallet JS SDK storage to sandbox wallet storages by DID.
 */
export class JSSDKLocalStorage implements WalletStorage {
  private activeMasterWalletID: string;

  constructor(private signedInDID: string) { }

  public setActiveMasterWalletID(masterWalletID: string): Promise<void> {
    this.activeMasterWalletID = masterWalletID;
    return;
  }

  public async getActiveMasterWalletID(): Promise<string> {
    return await this.activeMasterWalletID;
  }

  public loadStore(masterWalletID?: string): Promise<JSONObject> {
    if (!masterWalletID)
      masterWalletID = this.activeMasterWalletID;

    return GlobalStorageService.instance.getSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID, null);
  }

  public async saveStore(j: JSONObject): Promise<void> {
    if (!this.activeMasterWalletID)
      return Promise.reject("no master wallet ID");

    let storeIDs = await this.getMasterWalletIDs();
    if (!storeIDs.includes(this.activeMasterWalletID)) {
      storeIDs.push(this.activeMasterWalletID);
      await this.saveMasterWalletIDs(storeIDs);
    }

    return GlobalStorageService.instance.setSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-store-" + this.activeMasterWalletID, j);
  }

  public getMasterWalletIDs(): Promise<string[]> {
    return GlobalStorageService.instance.getSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-stores", []);
  }

  private saveMasterWalletIDs(walletIDs: string[]): Promise<void> {
    return GlobalStorageService.instance.setSetting(this.signedInDID, "wallet", "elastoswalletjssdkstorage-stores", walletIDs);
  }
}