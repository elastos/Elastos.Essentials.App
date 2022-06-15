import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class UiService {

  constructor() { }

  public getFriendlyDate(timestampSeconds: number) {
    return moment(timestampSeconds * 1000).format('lll');
  }

  public getFriendlyStorageSize(storageSizeBytes: number): number {
    if (storageSizeBytes > 0) {
      if (Number.isInteger(storageSizeBytes)) {
        return storageSizeBytes;
      } else {
        return parseFloat(storageSizeBytes.toFixed(2));
      }
    } else {
      return 0;
    }
  }

  public getGbStorage(mb: number) {
    return mb / 1000;
  }
}
