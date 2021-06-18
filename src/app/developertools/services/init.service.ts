import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { DAppService } from './dapp.service';

@Injectable({
  providedIn: 'root'
})
export class DeveloperToolsInitService extends GlobalService {
  constructor(
    private dappService: DAppService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    this.dappService.init();
  }

  public async onUserSignOut(): Promise<void> {

  }
}
