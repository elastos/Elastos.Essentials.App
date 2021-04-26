import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalConnectService } from './global.connect.service';
import { GlobalNavService } from './global.nav.service';

declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;

@Injectable({
  providedIn: 'root'
})
export class GlobalIntentService {
  // Emits received intents from the app manager.
  public intentListener = new BehaviorSubject<EssentialsIntentPlugin.ReceivedIntent>(null);

  constructor(
    private globalNav: GlobalNavService
  ) {}

  public async init(): Promise<void> {
    Logger.log("Intents", "Global intent service is initializing");
  }

  public async listen() {
    Logger.log("Intents", "Listening to external incoming intents");
    essentialsIntentManager.addIntentListener((receivedIntent)=>{
      Logger.log("Intents", "Intent received, now dispatching to listeners", receivedIntent);
        this.intentListener.next(receivedIntent);
    });
  }

  sendIntent(action: string, params?: any): Promise<any> {
    Logger.log("Intents", "Sending intent", action, params);
    return essentialsIntentManager.sendIntent(action, params);
  }

  sendUrlIntent(url: string): Promise<any> {
    Logger.log("Intents", "Sending url intent", url);
    return essentialsIntentManager.sendUrlIntent(url)
  }

  sendIntentResponse(result: any, intentId: number): Promise<void> {
    Logger.log("Intents", "Sending intent response ", result, intentId);
    this.globalNav.exitCurrentContext();

    // Make sure that the result is JSON data. This is the only format we want to support.
    try {
      JSON.stringify(result);
    }
    catch (e) {
      Logger.error("Intents", "Intent response error", e);
      throw new Error("sendIntentResponse() error: Result data is not a valid JSON object");
    }

    // If we have an active connection to a connectivity SDK, we send the connection token back
    // as well as part of the intent result, so the server can match this response to the original
    // Request.
    //
    // TODO: careful when some day several websites connect to essentials at the same time, we
    // have to handle multiple instances and save which WS socket instance has received the intent
    // request!
    //if (GlobalConnectService.instance.getActiveConnectionToken())
    //  result["connectionToken"] = GlobalConnectService.instance.getActiveConnectionToken();

    return essentialsIntentManager.sendIntentResponse(result, intentId);
  }
}
