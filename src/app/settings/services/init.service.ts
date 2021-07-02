import { Injectable } from '@angular/core';
import { DeveloperService } from './developer.service';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsInitService {
  constructor(
    private settings: SettingsService,
    private developer: DeveloperService
  ) {}

  public async init(): Promise<void> {
    // Mandatory services start
    await this.settings.init();
    await this.developer.init(); // TODO: not needed at boot. Only when entering settings
  }
}
