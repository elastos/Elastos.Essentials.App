import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Logger } from '../logger';

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalStorageService {
  public static instance: GlobalStorageService;  // Convenient way to get this service from non-injected classes
  public static ionicStorage: Storage; // Convenient way to get ionic storage from non-injected classes

  constructor(private storage: Storage) {
    GlobalStorageService.instance = this;
    GlobalStorageService.ionicStorage = storage;
  }

  private getFullStorageKey(did: string | null, networkTemplate: string | null, context, key): string {
    let fullKey = "";
    if (did) {
      // For backward compatibility, mainnet network template uses old style storage keys (no network suffix).
      let networkKey = networkTemplate === 'MainNet' ? '' : ':' + networkTemplate;
      fullKey += did + networkKey + "_";
    }
    fullKey += context + "_" + key;
    return fullKey;
  }

  /**
   * Deletes all settings for a specific DID.
   */
  public async deleteDIDSettings(did: string, networkTemplate: string): Promise<void> {
    // Delete all settings that start with the DID string
    let existingKeys: string[] = await this.storage.keys();
    let deletedEntries = 0;
    let networkKey = networkTemplate === 'MainNet' ? '' : ':' + networkTemplate;
    for (let key of existingKeys) {
      if (key.startsWith(did + networkKey + "_")) {
        await this.storage.remove(key);
        deletedEntries++;
      }
    }

    Logger.log("StorageService", "Deleted " + deletedEntries + " settings entries for DID " + did);
  }

  public setSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, value: T): Promise<void> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);
    //Logger.log("STORAGEDEBUG", "setSetting", context, key, value);
    return this.storage.set(fullKey, JSON.stringify(value)).then((res) => {
    }, (err) => {
    });
  }

  public async getSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, defaultValue: T): Promise<T> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    try {
      let res = await this.storage.get(fullKey);
      if (res === undefined || res === null)
        return defaultValue;
      else {
        let parsed = JSON.parse(res);
        return parsed;
      }
    }
    catch (err) {
      Logger.warn('StorageService', "Global storage service getSetting() error:", fullKey, err);
      return defaultValue;
    }
  }

  public deleteSetting(did: string | null, networkTemplate: string | null, context: string, key: string): Promise<void> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);
    return this.storage.remove(fullKey);
  }
}
