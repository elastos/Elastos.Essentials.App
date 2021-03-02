import { Injectable } from '@angular/core';
import { AppService } from './app.service';
import { BackgroundService } from './background.service';
import { HiveService } from './hive.service';

@Injectable({
  providedIn: 'root'
})
export class HiveManagerInitService {
  constructor(
    private hiveService: HiveService,
    private backgroundService: BackgroundService,
    private appService: AppService
  ) {}

  public async init(): Promise<void> {
    // Start mandatory services
    await this.hiveService.init();
    await this.appService.init();

    this.backgroundService.init();
  }
}
