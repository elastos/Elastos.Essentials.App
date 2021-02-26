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
  constructor(
    private storage: Storage,
    private platform: Platform
  ) {
  }

  private getFullStorageKey(did: string | null, context, key): string {
    let fullKey: string = "";
    if (did)
      fullKey += did + "_";
    fullKey += context + "_" + key;
    return fullKey;
  }

  public async setSetting<T>(did: string | null, context: string, key: string, value: T): Promise<void> {
    return this.storage.set(this.getFullStorageKey(did, context, key), JSON.stringify(value)).then((res) => {
    }, (err) => {
    });
  }

  public async getSetting<T>(did: string | null, context: string, key: string, defaultValue: T): Promise<T> {
    if (!(key in await this.storage.keys()))
      return defaultValue;

    return this.storage.get(this.getFullStorageKey(did, context, key)).then((res) => {
      return JSON.parse(res);
    }, (err) => {
      return defaultValue;
    });
  }
}
