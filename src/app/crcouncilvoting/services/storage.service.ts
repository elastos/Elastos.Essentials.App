import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage) {
  }

  public setVotes(value: any) {
    return this.storage.set("crcouncilvotes", JSON.stringify(value)).then((data) => {
      console.log('Stored votes', data)
    });
  }

  public getVotes(): Promise<any> {
    return this.storage.get("crcouncilvotes").then((data) => {
      console.log(data)
      return JSON.parse(data);
    });
  }
}
