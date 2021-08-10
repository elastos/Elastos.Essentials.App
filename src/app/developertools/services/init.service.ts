import { Injectable } from '@angular/core';
import { runDelayed } from 'src/app/helpers/sleep.helper';
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

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // NOTE: eventhough this dappService init is mandatory we give ourselves a few seconds to
    // release the startup from too many operations, knowing that users may never enter the developer
    // dapp tool so quickly.
    runDelayed(() => this.dappService.init(), 5000);
    return;
  }

  public async onUserSignOut(): Promise<void> {

  }
}
