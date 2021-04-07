import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class UiService {

  constructor() { }

  public getFriendlyDate(timestampSeconds: number) {
    return moment(timestampSeconds*1000).format('lll');
  }

  public getFriendlyStorageSize(storageSize: number): number {
    if(storageSize > 0) {
      if(Number.isInteger(storageSize)) {
        return storageSize;
      } else {
        return parseFloat(storageSize.toFixed(2));
      }
    } else {
      return 0;
    }
  }

  public getGbStorage(mb: number) {
    return mb / 1000;
  }
}
