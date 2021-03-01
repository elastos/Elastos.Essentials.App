import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { DIDSessionsService, IdentityEntry } from 'src/app/services/didsessions.service';
import { AppmanagerService } from './appmanager.service';
import { DIDManagerService } from './didmanager.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class LauncherInitService {
  constructor(
    public didService: DIDManagerService,
    private translate: TranslateService,
    private didSessions: DIDSessionsService,
    private appManagerService: AppmanagerService,
    private tipsService: TipsService,
    private didManager: DIDManagerService
  ) {}

  public async init(): Promise<void> {
    console.log("Launcher service is initializing");

    this.didManager.init();

    this.didSessions.signedInIdentityListener.subscribe((identity: IdentityEntry) => {
      if (identity) {
        // No blocking services start
        this.appManagerService.init();
        this.tipsService.init();
      }
    });
  }
}
