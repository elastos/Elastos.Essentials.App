import { Injectable } from '@angular/core';
import { LanguageService } from 'src/app/didsessions/services/language.service';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsInitService {
  constructor(
    private languageService: LanguageService,
    private settings: SettingsService
  ) {}

  public async init(): Promise<void> {
    console.log("Settings init service is initializing");

    // Mandatory services start
    await this.settings.init();
    await this.languageService.init();
  }
}
