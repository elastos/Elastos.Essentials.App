import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Logger } from '../logger';

declare let appManager: AppManagerPlugin.AppManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalIntentService {
  // Emits received intents from the app manager.
  public intentListener = new Subject<AppManagerPlugin.ReceivedIntent>();

  constructor() {}

  public async init(): Promise<void> {
    console.log("Global intent service is initializing");

    appManager.setIntentListener((receivedIntent)=>{
      Logger.log("global", "Intent received, now dispatching to listeners", receivedIntent);
      this.intentListener.next(receivedIntent);
    });
  }
}
