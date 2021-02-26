import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalStorageService {
  constructor(private storage: Storage) {
  }

  private getFullStorageKey(did: string | null, context, key): string {
    let fullKey: string = "";
    if (did)
      fullKey += did + "_";
    fullKey += context + "_" + key;
    return fullKey;
  }

  public async setSetting<T>(did: string | null, context: string, key: string, value: T): Promise<void> {
    let fullKey = this.getFullStorageKey(did, context, key);
    return this.storage.set(fullKey, JSON.stringify(value)).then((res) => {
    }, (err) => {
    });
  }

  public async getSetting<T>(did: string | null, context: string, key: string, defaultValue: T): Promise<T> {
    let fullKey = this.getFullStorageKey(did, context, key);

    // Return the default value is nothing saved in file system yet.
    let existingKeys: string[] = await this.storage.keys();
    if (!existingKeys.find((k)=>k === fullKey)) {
      return defaultValue;
    }

    return this.storage.get(fullKey).then((res) => {
      return JSON.parse(res);
    }, (err) => {
      console.warn("Global storage service getSetting() error:", fullKey, err);
      return defaultValue;
    });
  }
}
