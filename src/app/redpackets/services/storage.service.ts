import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage) {
  }

  public setAddress(value: any) {
    return this.storage.set("address", JSON.stringify(value)).then((data) => {
      console.log('Address Stored', data);
    });
  }

  public getAddress(): Promise<any> {
    return this.storage.get("address").then((data) => {
      console.log('Address Fetched', data);
      return JSON.parse(data);
    });
  }
}
