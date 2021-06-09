import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalService } from 'src/app/services/global.service.manager';
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
    private didSessions: GlobalDIDSessionsService,
    private globalNav: GlobalNavService
  ) {
    super();
  }

  public init(): Promise<void> {
    this.appService.init();
    this.intentService.init();
    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
  }

  public async onUserSignOut(): Promise<void> {

  }

  public async start() {
    await this.friendsService.init();

    await this.globalNav.navigateTo('contacts', '/contacts/friends');

    void this.backupService.init();
  }
}
