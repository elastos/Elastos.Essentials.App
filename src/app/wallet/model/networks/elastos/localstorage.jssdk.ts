/* import type {WalletStorage} from  "@elastosfoundation/wallet-js-sdk";
import { JSONObject } from "@elastosfoundation/wallet-js-sdk/typings/types";
import { GlobalStorageService } from "src/app/services/global.storage.service";
 */

/**
 * Custom Elastos wallet JS SDK storage to sandbox wallet storages by DID.
 */
/* export class JSSDKLocalStorage implements WalletStorage {
  public currentMasterWalletID: string; // From the interface, don't touch

  constructor(private signedInDID: string) {}

  loadStore(masterWalletID?: string): JSONObject {
    GlobalStorageService.instance.getSetting(this.signedInDID, "elastoswalletjssdkstorage-didstore-"+masterWalletID, null);
  }

  saveStore(j: JSONObject): void {
    throw new Error("Method not implemented.");
  }

  getMasterWalletIDs(): string[] {
    throw new Error("Method not implemented.");
  }
} */