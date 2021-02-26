import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ReceivedIntent, TemporaryAppManagerPlugin } from '../TMP_STUBS';

@Injectable({
  providedIn: 'root'
})
export class GlobalIntentService {
  // Emits received intents from the app manager.
  public intentListener = new Subject<ReceivedIntent>();

  constructor(
    private appManager: TemporaryAppManagerPlugin
  ) {}

  public async init(): Promise<void> {
    console.log("Global intent service is initializing");

    this.appManager.setIntentListener((receivedIntent)=>{
      console.log("Intent received, now dispatching to listeners", receivedIntent);
      this.intentListener.next(receivedIntent);
    });
  }
}
