import { JSONObject } from "src/app/model/json";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { NetworkTemplateStore } from "src/app/services/stores/networktemplate.store";
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

export type CacheEntry<T> = {
  key: string;
  timeValue: number;
  data: T;
}

/**
 * Cache with the following features:
 * - Persistent on disk.
 * - Items sorted by an optional time value (ex: for transactions list).
 * - A max number of items is kept on disk.
 * - Adds or overwrites existing items by key.
 */
export class TimeBasedPersistentCache<T extends JSONObject> {
  // List of items, sorted by time value.
  private items: CacheEntry<T>[];

  /**
   * Creates a new cache.
   *
   * @param name Name used to uniquely identify this cache on disk.
   * @param maxItemsOnDisk Maximum number of items that are saved to disk. Older items are deleted.
   */
  private constructor(public name: string, private maxItemsOnDisk: number, private storeGlobally: boolean) { }

  /**
   * Returns a cache with data already loaded from disk if any, or an empty cache otherwise.
   * If storeGlobally is true, data on disk is not sandbox for the active DID, it's shared by everyone.
   */
  public static async loadOrCreate<T extends JSONObject>(name: string, storeGlobally = false, maxItemsOnDisk = 100): Promise<TimeBasedPersistentCache<T>> {
    let cache = new TimeBasedPersistentCache<T>(name, maxItemsOnDisk, storeGlobally);
    await cache.load();
    return cache;
  }

  /**
   * Adds or updates an item to the cache. Item keys are unique.
   * If set() is called again with an existing key, the existing item is overwritten.
   */
  public set(itemKey: string, data: T, timeValue = 0) {
    let existingIndex = this.items.findIndex(i => i.key == itemKey);

    let newEntry = {
      key: itemKey,
      timeValue,
      data
    };
    if (existingIndex === -1) {
      // Insert the new item
      this.items.push(newEntry);
    }
    else {
      this.items[existingIndex] = newEntry;
    }

    // Sort the cache by time value. TBD: inefficient: better to directly insert at the right index.
    this.items.sort((a, b) => {
      // timeValue == 0: the transaction is pending, waiting for confirm.
      if (a.timeValue === 0) {
        return -1;
      }

      if (b.timeValue === 0) {
        return 1;
      }

      if (a.timeValue > b.timeValue)
        return -1;
      else if (a.timeValue < b.timeValue)
        return 1;
      else
        return 0;
    });
  }

  /**
   * Remove an item from the cache.
   */
  public remove(itemKey: string) {
    let existingIndex = this.items.findIndex(i => i.key == itemKey);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1)
    }
  }

  /**
   * Retrieves a cache item by key.
   */
  public get(itemKey: string): CacheEntry<T> | undefined {
    return this.items.find(i => i.key == itemKey);
  }

  /**
   * Returns the cache values. Values are already sorted by time value.
   */
  public values(): CacheEntry<T>[] {
    return this.items;
  }

  /**
   * Returns the current number of items in the loaded cache.
   */
  public size(): number {
    return this.items.length;
  }

  /**
   * Saves the whole cache to disk.
   */
  public async save(): Promise<void> {
    // Keep at most maxItemsOnDisk items.
    let itemsToSave = this.items.slice(0, Math.min(this.items.length, this.maxItemsOnDisk));
    await GlobalStorageService.instance.setSetting(this.storeGlobally ? null : DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "cache", this.name, itemsToSave);
  }

  /**
   * Loads the cache from disk.
   */
  public async load(): Promise<void> {
    this.items = await GlobalStorageService.instance.getSetting(this.storeGlobally ? null : DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "cache", this.name, []);
  }

  /**
   * Delete cache.
   */
  public async delete() {
    await GlobalStorageService.instance.deleteSetting(this.storeGlobally ? null : DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "cache", this.name);
  }
}
