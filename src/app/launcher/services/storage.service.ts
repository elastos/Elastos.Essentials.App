import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private storage: Storage
  ) {
  }

  public setSetting(key: string, value: any) {
    return this.storage.set(key, JSON.stringify(value)).then((res) => {
      console.log('setSetting', res);
    }, (err) => {
      console.error('setSetting', err);
    });
  }

  public getSetting(key: string): Promise<any> {
    return this.storage.get(key).then((res) => {
      console.log('getSetting', res);
      return JSON.parse(res);
    }, (err) => {
      console.error('getSetting', err);
    });
  }
}
