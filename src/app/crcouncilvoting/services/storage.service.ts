import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Logger } from 'src/app/logger';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage) {
  }

  public setVotes(value: any) {
    return this.storage.set("crcouncilvotes", JSON.stringify(value)).then((data) => {
      Logger.log('crcouncil', 'Stored votes', data)
    });
  }

  public getVotes(): Promise<any> {
    return this.storage.get("crcouncilvotes").then((data) => {
      Logger.log('crcouncil', data)
      return JSON.parse(data);
    });
  }
}
