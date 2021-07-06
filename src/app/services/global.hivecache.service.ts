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
  private cache = new Map<string, BehaviorSubject<string>>(); // Map of asset unique key / asset data

  constructor(private globalHiveService: GlobalHiveService) {
  }

  /**
   * Returns a cached asset previously fetched from a hive vault using a
   * hive scripting url. If no item if cached:
   * - if hiveScriptUrl is set: fetched the assets from hive then caches and returns the asset.
   * - if hiveScriptUrl is not set: returns null.
   */
  public getAssetByUrl(key: string, hiveScriptUrl?: string): BehaviorSubject<string> {
    // Already in cache? Return the cached data.
    if (this.cache.has(key))
      return this.cache.get(key);

    // Nothing in cache? try to fetch something
    let subject = new BehaviorSubject(null);
    this.cache.set(key, subject);

    if (hiveScriptUrl) {
      Logger.log("hivecache", "Fetching hive asset at ", hiveScriptUrl);

      // Don't block the current call
      // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
      void new Promise<void>(async (resolve) => {
         //let hiveClient = await this.globalHiveService.getHiveClient();
        //let reader = await hiveClient.downloadFileByScriptUrl(hiveScriptUrl); // Broken in Hive Java SDK 2.0.29

        // TODO: TMP WHILE HIVE BUG IS NOT FIXED - ONLY WORKS FOR PERSONAL AVATAR !!! NOT WORKING FOR OTHER PICTURES FROM OTHER USERS
        // TODO: REPLACE WITH THE 2 LINES ABOVE

        let activeVault = await this.globalHiveService.getActiveVault();
        let directCallResult = await activeVault.getScripting().call("getMainIdentityAvatar", {}, GlobalConfig.ESSENTIALS_APP_DID);
        //console.log("DIRECT SCRIPT CALL RESULT:", directCallResult);
        let txId = directCallResult["download"]["transaction_id"];
        //console.log("DOWNLOAD TX ID:", txId);
        let reader = await activeVault.getScripting().downloadFile(txId);
        let blob: any = await reader.readAll();

        let fileReader = new FileReader();
        fileReader.addEventListener('loadend', (e) => {
          let assetData = e.target.result; // "data:image/png;base64,......"
          Logger.log("hivecache", "Emitting hive asset to listeners:", key, hiveScriptUrl, assetData);
          subject.next(assetData);
        });

        // TODO: DIRTY - hive plugin's readAll() is supposed to return a Blob type but we actually seem to get
        // a ArrayBuffer object.
        if (blob instanceof ArrayBuffer)
          fileReader.readAsText(new Blob([new Uint8Array(blob)]));
        else
          fileReader.readAsText(blob);

        resolve();
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
  public set(key: string, data: string) {
    Logger.log("hivecache", "Setting cache item:", key, data);
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
