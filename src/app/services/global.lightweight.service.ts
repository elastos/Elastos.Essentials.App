import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { IdentityEntry } from '../model/didsessions/identityentry';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';

@Injectable({
  providedIn: 'root'
})
export class GlobalLightweightService extends GlobalService {
  public static instance: GlobalLightweightService = null;

  public lightweightMode = new BehaviorSubject<boolean>(true); // Default: lightweight mode

  constructor(private prefs: GlobalPreferencesService) {
    super();
    GlobalLightweightService.instance = this;
  }

  public async init() {
    GlobalServiceManager.getInstance().registerService(this);

    this.prefs.preferenceListener.subscribe(prefChanged => {
      if (prefChanged.key == 'ui.lightweight') {
        let lightweight = prefChanged.value as boolean;
        this.lightweightMode.next(lightweight);
      }
    });

    // Initialize lightweight mode when user is not signed in
    await this.fetchLightweightMode();
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.fetchLightweightMode();
  }

  public onUserSignOut(): Promise<void> {
    // Reset to default lightweight mode
    this.lightweightMode.next(true);
    return;
  }

  /**
   * Retrieves and stores current lightweight mode setting.
   */
  async fetchLightweightMode(): Promise<void> {
    Logger.log('LightweightService', 'Fetching lightweight mode information');

    if (DIDSessionsStore.signedInDIDString) {
      let lightweightFromPref: boolean = await this.prefs.getLightweightMode(
        DIDSessionsStore.signedInDIDString,
        NetworkTemplateStore.networkTemplate
      );

      Logger.log('LightweightService', 'Lightweight mode from preferences:', lightweightFromPref);
      this.lightweightMode.next(lightweightFromPref);
    } else {
      // Default to lightweight mode when not signed in
      this.lightweightMode.next(true);
    }
  }

  /**
   * Sets the lightweight mode for the current user.
   */
  public async setLightweightMode(lightweight: boolean): Promise<void> {
    if (DIDSessionsStore.signedInDIDString) {
      Logger.log('LightweightService', 'Setting lightweight mode:', lightweight);
      await this.prefs.setLightweightMode(
        DIDSessionsStore.signedInDIDString,
        NetworkTemplateStore.networkTemplate,
        lightweight
      );
      this.lightweightMode.next(lightweight);
    }
  }

  /**
   * Gets the current lightweight mode value synchronously.
   */
  public getCurrentLightweightMode(): boolean {
    return this.lightweightMode.value;
  }
}
