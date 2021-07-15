import { JSONObject } from "src/app/model/json";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";

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
  constructor(private name: string, private maxItemsOnDisk = 100) {}

  /**
   * Returns a cache with data already loaded from disk if any, or an empty cache otherwise.
   */
  public static async loadOrCreate<T extends JSONObject>(name: string): Promise<TimeBasedPersistentCache<T>> {
    let cache = new TimeBasedPersistentCache<T>(name);
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
  public get(itemKey: string): JSONObject | undefined {
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
    await GlobalStorageService.instance.setSetting(GlobalDIDSessionsService.signedInDIDString, "cache", this.name, itemsToSave);
  }

  /**
   * Loads the cache from disk.
   */
  public async load(): Promise<void> {
    this.items = await GlobalStorageService.instance.getSetting(GlobalDIDSessionsService.signedInDIDString, "cache", this.name, []);
  }

  /**
   * Delete cache.
   */
  public async delete() {
    await GlobalStorageService.instance.deleteSetting(GlobalDIDSessionsService.signedInDIDString, "cache", this.name);
  }
}
