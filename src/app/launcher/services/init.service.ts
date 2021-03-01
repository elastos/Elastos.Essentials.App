import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService } from './appmanager.service';
import { DidmanagerService } from './didmanager.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class LauncherInitService {
  constructor(
    public appManager: AppmanagerService,
    public didService: DidmanagerService,
    private translate: TranslateService
  ) {}

  public async init(): Promise<void> {
    console.log("Launcher service is initializing");

    // Mandatory services start
    await this.appManager.init();
    await this.didService.init();

    console.log("Launcher service - mandatory dependencies are initialized");
  }
}
