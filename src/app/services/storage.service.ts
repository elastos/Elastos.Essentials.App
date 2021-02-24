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
  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
    });
  }

  public async setSetting<T>(did: string, context: string, key: string, value: T): Promise<void> {
    // TODO @chad
  }

  public getSetting<T>(did: string, context: string, key: string, defaultValue: T): Promise<T> {
    // TODO @chad
    return null;
  }
}
