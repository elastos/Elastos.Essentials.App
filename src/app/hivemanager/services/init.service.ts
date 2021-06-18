import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AppService } from './app.service';
import { BackgroundService } from './background.service';
import { HiveService } from './hive.service';

@Injectable({
  providedIn: 'root'
})
export class HiveManagerInitService extends GlobalService {
  constructor(
    private hiveService: HiveService,
    private backgroundService: BackgroundService,
    private appService: AppService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);

    this.appService.init();
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.hiveService.init();
    this.backgroundService.init();
  }

  public async onUserSignOut(): Promise<void> {
    this.hiveService.stop();
  }

  /**
   * Simulates a regular "app start" (without intents). This method is responsible for deciding the proper
   * route to use, according to current module (sub-app) state.
   */
  public async start() {
    this.appService.startDefaultScreen();
  }
}
