import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { AppService } from './app.service';
import { BackgroundService } from './background.service';
import { HiveService } from './hive.service';

@Injectable({
  providedIn: 'root'
})
export class HiveManagerInitService {
  constructor(
    private hiveService: HiveService,
    private backgroundService: BackgroundService,
    private appService: AppService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    await this.appService.init();

    this.didSessions.signedInIdentityListener.subscribe(async (signedInIdentity)=>{
      if (signedInIdentity) {
        await this.hiveService.init();

        this.backgroundService.init();
      } else {
        this.hiveService.stop();
      }
    });
  }

  /**
   * Simulates a regular "app start" (without intents). This method is responsible for deciding the proper
   * route to use, according to current module (sub-app) state.
   */
  public async start() {
    this.appService.startDefaultScreen();
  }
}
