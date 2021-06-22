import { Injectable } from '@angular/core';
import { UXService } from './ux.service';
import { BackgroundService } from './background.service';
import { HiveService } from './hive.service';
import { IntentReceiverService } from './intentreceiver.service';
import { TranslationService } from './translation.service';
import { DIDEvents } from './events';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class IdentityInitService {
  constructor(
    private uxService: UXService,
    private hiveService: HiveService,
    private backgroundService: BackgroundService,
    public didEvents: DIDEvents,
    private intentReceiverService: IntentReceiverService,
    public translationService: TranslationService // Don't delete, static instance initialized
  ) {}

  public async init(): Promise<void> {
    await this.backgroundService.init();
    await this.uxService.init();
    await this.intentReceiverService.init();
    await this.hiveService.init();
  }

  public start() {
    this.uxService.computeAndShowEntryScreen();
  }
}
