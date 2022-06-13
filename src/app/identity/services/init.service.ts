import { Injectable } from '@angular/core';
import { BackgroundService } from './background.service';
import { BackupService } from './backup.service';
import { DIDService } from './did.service';
import { DIDSyncService } from './didsync.service';
import { IntentReceiverService } from './intentreceiver.service';
import { ProfileService } from './profile.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class IdentityInitService {
  constructor(
    private uxService: UXService,
    private backgroundService: BackgroundService,
    private didSyncService: DIDSyncService,
    private profileService: ProfileService,
    private didService: DIDService,
    private intentReceiverService: IntentReceiverService,
    private backupService: BackupService
  ) { }

  public init() {
    this.didService.init();
    this.backgroundService.init();
    this.didSyncService.init();
    this.profileService.init();
    this.uxService.init();
    this.intentReceiverService.init();
    this.backupService.init();
  }

  public start() {
    void this.uxService.computeAndShowEntryScreen();
  }
}
