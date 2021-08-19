import { Injectable } from '@angular/core';
import { UXService } from './ux.service';
import { BackgroundService } from './background.service';
import { IntentReceiverService } from './intentreceiver.service';
import { TranslationService } from './translation.service';
import { DIDEvents } from './events';
import { ProfileService } from './profile.service';
import { DIDSyncService } from './didsync.service';
import { BackupService } from './backup.service';
import { DIDService } from './did.service';

@Injectable({
  providedIn: 'root'
})
export class IdentityInitService {
  constructor(
    private uxService: UXService,
    private backgroundService: BackgroundService,
    public didEvents: DIDEvents,
    private didSyncService: DIDSyncService,
    private profileService: ProfileService,
    private didService: DIDService,
    private intentReceiverService: IntentReceiverService,
    private backupService: BackupService,
    public translationService: TranslationService // Don't delete, static instance initialized
  ) {}

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
