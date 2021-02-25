import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AppmanagerService } from './appmanager.service';
import { DidmanagerService } from './didmanager.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class LauncherModuleService {
  constructor(
    public appManager: AppmanagerService,
    public didService: DidmanagerService,
    private tipsService: TipsService
  ) {}

  public async init(): Promise<void> {
    console.log("Launcher service is initializing");

    // Mandatory services start
    await this.appManager.init();
    await this.didService.init();

    console.log("Launcher service - mandatory dependencies are initialized");

    // No blocking services start
    this.tipsService.init();
  }
}
