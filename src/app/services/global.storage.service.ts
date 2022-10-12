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

  // Local memory cache to reduce the number of calls to the (slow) sqlite cordova plugin.
  private cache: {
    [key: string]: any
  } = {};

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
        delete this.cache[key];
        await this.storage.remove(key);
        deletedEntries++;
      }
    }

    Logger.log("StorageService", "Deleted " + deletedEntries + " settings entries for DID " + did);
  }

  public setSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, value: T): Promise<void> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    this.cache[fullKey] = JSON.stringify(value);

    // Don't await to save time. We have the local memory cache
    void this.storage.set(fullKey, JSON.stringify(value)).then((res) => { }, (err) => { });

    return;
  }

  public async getSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, defaultValue: T): Promise<T> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    console.log('getsetting', key)

    try {
      let res = this.cache[fullKey];

      // Not found in memory cache => query sqlite
      if (res === undefined) {
        res = await this.storage.get(fullKey);
        this.cache[fullKey] = res;
      }

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

    delete this.cache[fullKey];

    return this.storage.remove(fullKey);
  }
}
