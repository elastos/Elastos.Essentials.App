import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { AppService } from '../services/app.service';
import { BackupService } from '../services/backup.service';
import { IntentService } from '../services/intent.service';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class ContactsInitService {
  constructor(
    private appService: AppService,
    private intentService: IntentService,
    private friendsService: FriendsService,
    private backupService: BackupService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    this.appService.init();
    this.intentService.init();

    this.didSessions.signedInIdentityListener.subscribe(async (signedInIdentity)=>{
      if (signedInIdentity) {
        await this.friendsService.init();
        this.backupService.init();
      }
    });
  }
}
