import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Logger } from 'src/app/logger';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage) {
  }

  public setNodes(value: any) {
    return this.storage.set("nodes", JSON.stringify(value)).then((data) => {
      Logger.log('dposvoting', 'Stored nodes', data)
    });
  }

  public getNodes(): Promise<any> {
    return this.storage.get("nodes").then((data) => {
      return JSON.parse(data);
    });
  }

  public setVotes(value: any) {
    return this.storage.set("votes", JSON.stringify(value)).then((data) => {
      Logger.log('dposvoting', 'Stored votes', data)
    });
  }

  public getVotes(): Promise<any> {
    return this.storage.get("votes").then((data) => {
      return JSON.parse(data);
    });
  }

  public setVisit(value: boolean) {
    return this.storage.set("visited", JSON.stringify(value)).then((data) => {
    });
  }

  public getVisit(): Promise<boolean> {
    return this.storage.get("visited").then((data) => {
      return JSON.parse(data);
    });
  }
}
