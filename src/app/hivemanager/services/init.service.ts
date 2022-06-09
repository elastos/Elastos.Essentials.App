import { Injectable } from '@angular/core';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
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

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);

    this.appService.init();

    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.hiveService.init();
    this.backgroundService.init();
  }

  public onUserSignOut(): Promise<void> {
    this.hiveService.stop();
    return;
  }

  /**
   * Simulates a regular "app start" (without intents). This method is responsible for deciding the proper
   * route to use, according to current module (sub-app) state.
   */
  public start(): Promise<void> {
    this.appService.startDefaultScreen();
    return;
  }
}
