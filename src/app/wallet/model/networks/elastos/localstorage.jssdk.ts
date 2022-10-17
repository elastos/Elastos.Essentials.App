import type { JSONObject, LocalStoreInfo, WalletStorage } from "@elastosfoundation/wallet-js-sdk";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { NetworkTemplateStore } from "src/app/services/stores/networktemplate.store";

/**
 * Custom Elastos wallet JS SDK storage to sandbox wallet storages by DID.
 */
export class JSSDKLocalStorage implements WalletStorage {
  constructor(private signedInDID: string) { }

  loadStore(masterWalletID: string): Promise<LocalStoreInfo> {
    return GlobalStorageService.instance.getSetting(this.signedInDID, NetworkTemplateStore.networkTemplate, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID, null);
  }

  async removeStore(masterWalletID: string): Promise<void> {
    let storeIDs = await this.getMasterWalletIDs();
    let index = storeIDs.findIndex(id => id == masterWalletID)
    if (index !== -1) {
      storeIDs.splice(index);
      await this.saveMasterWalletIDs(storeIDs);
    }
    return GlobalStorageService.instance.deleteSetting(this.signedInDID, NetworkTemplateStore.networkTemplate, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID);
  }

  public async saveStore(masterWalletID: string, j: JSONObject): Promise<void> {
    let storeIDs = await this.getMasterWalletIDs();
    if (!storeIDs.includes(masterWalletID)) {
      storeIDs.push(masterWalletID);
      await this.saveMasterWalletIDs(storeIDs);
    }

    return GlobalStorageService.instance.setSetting(this.signedInDID, NetworkTemplateStore.networkTemplate, "wallet", "elastoswalletjssdkstorage-store-" + masterWalletID, j);
  }

  public getMasterWalletIDs(): Promise<string[]> {
    return GlobalStorageService.instance.getSetting(this.signedInDID, NetworkTemplateStore.networkTemplate, "wallet", "elastoswalletjssdkstorage-stores", []);
  }

  private saveMasterWalletIDs(walletIDs: string[]): Promise<void> {
    return GlobalStorageService.instance.setSetting(this.signedInDID, NetworkTemplateStore.networkTemplate, "wallet", "elastoswalletjssdkstorage-stores", walletIDs);
  }
}