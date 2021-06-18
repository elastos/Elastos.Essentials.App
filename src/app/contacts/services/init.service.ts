import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AppService } from '../services/app.service';
import { BackupService } from '../services/backup.service';
import { IntentService } from '../services/intent.service';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class ContactsInitService extends GlobalService {
  constructor(
    private appService: AppService,
    private intentService: IntentService,
    private friendsService: FriendsService,
    private backupService: BackupService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);

    this.appService.init();
    this.intentService.init();
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.friendsService.init();
    this.backupService.init();

  }

  public async onUserSignOut(): Promise<void> {

  }
}
