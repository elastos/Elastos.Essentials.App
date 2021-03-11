import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalNavService } from './global.nav.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Injectable({
  providedIn: 'root'
})
export class GlobalIntentService {
  // Emits received intents from the app manager.
  public intentListener = new Subject<EssentialsIntentPlugin.ReceivedIntent>();

  constructor(private globalNav: GlobalNavService) {}

  public async init(): Promise<void> {
    Logger.log("Intents", "Global intent service is initializing");

    essentialsIntent.addIntentListener((receivedIntent)=>{
    Logger.log("Intents", "Intent received, now dispatching to listeners", receivedIntent);
      this.intentListener.next(receivedIntent);
    });
  }

  sendIntent(action: string, params?: any): Promise<any> {
    Logger.log("Intents", "Sending intent", action, params);
    return essentialsIntent.sendIntent(action, params);
  }

  sendIntentResponse(result: any, intentId: number): Promise<void> {
    Logger.log("Intents", "Sending intent response ", result, intentId);
    this.globalNav.navigateBack();
    return essentialsIntent.sendIntentResponse(result, intentId);
  }
}
