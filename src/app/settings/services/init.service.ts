import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsInitService {
  constructor(
    private settings: SettingsService
  ) {}

  public async init(): Promise<void> {
    // Mandatory services start
    await this.settings.init();
  }
}
