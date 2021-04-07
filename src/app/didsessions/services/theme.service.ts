import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';

// TODO @chad - Remove this didsessions specific theme service and use the global theme service
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public darkMode = false; // DID Sessions always in light mode as there is no "active user" to get preferences from

  constructor(private platform: Platform, private prefs: GlobalPreferencesService, private didSessions: GlobalDIDSessionsService) {
  }
}
