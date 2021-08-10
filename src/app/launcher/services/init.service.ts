import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AppmanagerService } from './appmanager.service';
import { DIDManagerService } from './didmanager.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class LauncherInitService extends GlobalService {
  constructor(
    public didService: DIDManagerService,
    private translate: TranslateService,
    private didSessions: GlobalDIDSessionsService,
    private appManagerService: AppmanagerService,
    private tipsService: TipsService,
    private didManager: DIDManagerService
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);

    this.didManager.init();

    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // No blocking services start
    this.appManagerService.init();
    this.tipsService.init();

    return;
  }

  public onUserSignOut(): Promise<void> {
    this.appManagerService.stop();

    return;
  }
}
