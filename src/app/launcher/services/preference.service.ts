import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
/*
@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private storage: Storage
  ) {
  }

  public setPreference(key: string, value: any) {
    return this.storage.set(key, JSON.stringify(value)).then((res) => {
      console.log('setPreference', res);
    }, (err) => {
      console.error('setPreference', err);
    });
  }

  public getPreference(key: string): Promise<any> {
    return this.storage.get(key).then((res) => {
      console.log('getPreference', res);
      return JSON.parse(res);
    }, (err) => {
      console.error('getPreference', err);
    });
  }
}
*/