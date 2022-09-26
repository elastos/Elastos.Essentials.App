import { Injectable } from '@angular/core';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { BackupService } from '../services/backup.service';
import { IntentService } from '../services/intent.service';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class ContactsInitService extends GlobalService {
  constructor(
    private intentService: IntentService,
    private friendsService: FriendsService,
    private backupService: BackupService,
    private globalNav: GlobalNavService
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.friendsService.init();
    // Make sure to call intent service after friends services because contacts must be
    // initialized before handling any intent that would modify contacts.
    this.intentService.init();
    void this.backupService.init();
  }

  public onUserSignOut(): Promise<void> {
    this.intentService.stop();
    this.backupService.stop();
    return;
  }

  public async start() {
    await this.globalNav.navigateTo('contacts', '/contacts/friends');
  }
}
