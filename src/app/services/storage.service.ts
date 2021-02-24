import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private storage: Storage,
    private platform: Platform
  ) {
  }

  public async setSetting<T>(did: string, context: string, key: string, value: T): Promise<void> {
    return this.storage.set(key, JSON.stringify(value)).then((res) => {
      console.log('setSetting', res);
    }, (err) => {
      console.error('setSetting', err);
    });
  }

  public getSetting<T>(did: string, context: string, key: string, defaultValue: T): Promise<T> {
    return this.storage.get(key).then((res) => {
      console.log('getSetting', res);
      return JSON.parse(res);
    }, (err) => {
      console.error('getSetting', err);
    });
  }
}
