import { Injectable } from '@angular/core';
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
  ) {}

  public async init(): Promise<void> {
    console.log("Contacts init service is initializing");

    this.appService.init();
    await this.friendsService.init();
    this.intentService.init();
    this.backupService.init();
  }
}
