import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Logger } from '../logger';

export type Preference<T> = {
  key: string;
  value: T;
}

/**
 * Support for 2 kind of storage:
 * - By default, ionic storage, which is actually configured to used the cordova sqlite storage. Use this for data that require permanent presistance. But slow.
 * - Browser local storage: for data that can be rebuilt and that can be lost sometimes. Faster than sqlite.
 */
export type StorageLocation = "ionic" | "browserlocalstorage";

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
    await this.deleteDIDSettingsIonic(did, networkTemplate);
    this.deleteDIDSettingsLocalStorage(did, networkTemplate);
  }

  private async deleteDIDSettingsIonic(did: string, networkTemplate: string): Promise<void> {
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

    Logger.log("StorageService", "Deleted " + deletedEntries + " ionic settings entries for DID " + did + " for network template " + networkTemplate);
  }

  private deleteDIDSettingsLocalStorage(did: string, networkTemplate: string) {
    const networkKey = networkTemplate === 'MainNet' ? '' : ':' + networkTemplate;
    const fullKey = did + networkKey + "_";

    // Delete backward as we are changing the storage length while deleting
    let deletedEntries = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      let key = localStorage.key(i);
      if (key.startsWith(fullKey)) {
        localStorage.removeItem(key);
        deletedEntries++;
      }
    }

    Logger.log("StorageService", "Deleted " + deletedEntries + " local storage settings entries for DID " + did + " for network template " + networkTemplate);
  }

  public deleteDIDSettingsLocalStorageStartWithKey(did: string, networkTemplate: string, keyPrefix: string) {
    const networkKey = networkTemplate === 'MainNet' ? '' : ':' + networkTemplate;
    const fullKey = did + networkKey + "_" + keyPrefix;

    // Delete backward as we are changing the storage length while deleting
    let deletedEntries = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      let key = localStorage.key(i);
      if (key.startsWith(fullKey)) {
        localStorage.removeItem(key);
        deletedEntries++;
      }
    }

    Logger.log("StorageService", "Deleted " + deletedEntries + " local storage settings entries for DID " + did + " for network template " + networkTemplate + " with key " + keyPrefix);
  }

  public setSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, value: T, location: StorageLocation = "ionic"): Promise<void> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    this.cache[fullKey] = JSON.stringify(value);

    // Don't await to save time. We have the local memory cache
    if (location === "ionic")
      void this.storage.set(fullKey, JSON.stringify(value)).then((res) => { }, (err) => { });
    else if (location === "browserlocalstorage")
      localStorage.setItem(fullKey, JSON.stringify(value));

    return;
  }

  public async getSetting<T>(did: string | null, networkTemplate: string | null, context: string, key: string, defaultValue: T, location: StorageLocation = "ionic"): Promise<T> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    try {
      let res = this.cache[fullKey];

      // Not found in memory cache => query sqlite
      if (res === undefined) {
        if (location === "ionic")
          res = await this.storage.get(fullKey);
        else if (location === "browserlocalstorage") {
          res = localStorage.getItem(fullKey);
        }

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

  public deleteSetting(did: string | null, networkTemplate: string | null, context: string, key: string, location: StorageLocation = "ionic"): Promise<void> {
    let fullKey = this.getFullStorageKey(did, networkTemplate, context, key);

    delete this.cache[fullKey];

    if (location === "ionic")
      void this.storage.remove(fullKey);
    else if (location === "browserlocalstorage")
      localStorage.removeItem(fullKey);

    return;
  }
}
