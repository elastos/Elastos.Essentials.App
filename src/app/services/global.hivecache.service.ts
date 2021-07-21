import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GlobalConfig } from '../config/globalconfig';
import { Logger } from '../logger';
import { GlobalHiveService } from './global.hive.service';

/**
 * Helper to easily retrieve and cache hive assets
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalHiveCacheService {
  public static instance: GlobalHiveCacheService = null;

  private cache = new Map<string, BehaviorSubject<any>>(); // Map of asset unique key / asset data

  constructor(private globalHiveService: GlobalHiveService) {
    GlobalHiveCacheService.instance = this;
  }

  /**
   * Returns a cached asset previously fetched from a hive vault using a
   * hive scripting url. If no item if cached:
   * - if hiveScriptUrl is set: fetched the assets from hive then caches and returns the asset.
   * - if hiveScriptUrl is not set: returns null.
   */
  public getAssetByUrl(key: string, hiveScriptUrl?: string): BehaviorSubject<any> {
    // Already in cache? Return the cached data.
    if (this.cache.has(key)) {
      console.log("DEBUG HIVE CACHE RETURN FROM KEY", key);
      return this.cache.get(key);
    }

    // Nothing in cache? try to fetch something
    let subject = new BehaviorSubject(null);
    this.cache.set(key, subject);

    if (hiveScriptUrl) {
      Logger.log("hivecache", "Fetching hive asset at ", hiveScriptUrl);

      // Don't block the current call
      void this.globalHiveService.fetchHiveScriptPicture(hiveScriptUrl).then(rawPicture => {
        subject.next(rawPicture);
      });
    }
    else {
      // No way to get data for now. Maybe someone will update this later.
    }

    return subject;
  }

  /**
   * Manually sets an assets value, for example right after creating a local avatar.
   */
  public set(key: string, data: any) {
    Logger.log("hivecache", "Setting hive cache item:", key);
    if (!this.cache.has(key))
      this.cache.set(key, new BehaviorSubject(data));

    this.cache.get(key).next(data);
  }

  /**
   * Removes an entry from the cache
   */
  public invalidate(key: string) {
    Logger.log("hivecache", "Invalidating cache item:", key);
    this.cache.set(key, null);
  }
}
