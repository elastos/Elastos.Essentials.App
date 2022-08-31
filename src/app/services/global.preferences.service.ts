import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { IdentityEntry } from '../model/didsessions/identityentry';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';

export type AllPreferences = { [key: string]: any };

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalPreferencesService implements GlobalService {
  public static instance: GlobalPreferencesService;  // Convenient way to get this service from non-injected classes

  // Generic subject, call only when a preference is actually modified
  public preferenceListener = new Subject<Preference<any>>();

  // Specific subjects, called when signing in and when preferences change.
  public useHiveSync = new BehaviorSubject<boolean>(false); // Whether to sync Essentials user data with the hive vault or not

  constructor(private storage: GlobalStorageService) {
    GlobalPreferencesService.instance = this;
    GlobalServiceManager.getInstance().registerService(this);
  }

  async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Emit a few subjects.
    this.useHiveSync.next(await this.getUseHiveSync(signedInIdentity.didString));
  }

  onUserSignOut(): Promise<void> {
    this.useHiveSync.next(false);
    return;
  }

  private getDefaultPreferences(): AllPreferences {
    return {
      "locale.language": "native system",
      "developer.mode": false,
      "developer.install.verifyDigest": false,
      "developer.backgroundservices.startonboot": true,
      "developer.screencapture": false,
      "privacy.identity.publication.medium": "assist", // 'assist' or 'wallet'
      "privacy.credentialtoolbox.stats": true, // Publish anonymous stats about credentials usage, to the external credential toolbox service, or not
      "privacy.hive.sync": false, // Whether to allow data to be synchronized with the hive vault or not (credentials, contacts, etc)
      "ui.darkmode": true,
      "ui.startupscreen": "home",
      "network.template": "MainNet",
      "chain.network.config": "",
      "chain.network.configurl": "",
      "elastosapi.provider": "elastosio"
    };
  }

  /**
   * Tells if a given preference was saved to persistent storage or if we may use the default value instead.
   */
  public async preferenceIsSet(did: string, key: string) {
    let diskPreferences = await this.storage.getSetting<AllPreferences>(did, "prefservice", "preferences", {});
    return key in diskPreferences;
  }

  /**
   * Get a specific system preference. System preferences setting shared by all parts of the app.
   *
   * @param key Unique key identifying the preference data.
   */
  public async getPreference<T>(did: string, key: string, allowNullDID = false): Promise<T> {
    if (did == null && !allowNullDID)
      throw new Error("Getting a global preference (no DID set) without allowNullDID set to false is forbidden! key= " + key);

    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference " + key + " is not a registered preference!");

    let preferences = await this.getPreferences(did, allowNullDID);
    if (!(key in preferences))
      throw new Error("Preference " + key + " is not a registered preference!");

    //Logger.log('PreferenceService', "GET PREF", key, preferences[key])

    return preferences[key];
  }

  /**
   * Get all system preferences.
   */
  public async getPreferences(did: string, allowNullDID = false): Promise<AllPreferences> {
    if (did == null && !allowNullDID)
      throw new Error("Getting global preferences (no DID set) without allowNullDID set to false is forbidden!");

    let diskPreferences = await this.storage.getSetting<AllPreferences>(did, "prefservice", "preferences", {});

    //Logger.log('PreferenceService', "DISK PREFS", did, diskPreferences)

    // Merge saved preferences with default values
    return Object.assign({}, this.getDefaultPreferences(), diskPreferences);
  }

  /**
   * Set specific system preference.
   *
   * @param key   Unique key identifying the preference data.
   * @param value The data to be stored. If null is passed, the preference is restored to system default value.
   */
  public async setPreference(did: string, key: string, value: any, allowNullDID = false): Promise<void> {
    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference " + key + " is not a registered preference!");

    let preferences = await this.getPreferences(did, allowNullDID);
    preferences[key] = value;

    await this.storage.setSetting<AllPreferences>(did, "prefservice", "preferences", preferences);

    // Notify listeners about a preference change
    this.preferenceListener.next({ key, value });
  }

  /**
   * Delete all system preferences.
   * Call this when the did is deleted.
   */
  public async deletePreferences(did: string, allowNullDID = false) {
    if (did == null && !allowNullDID)
      throw new Error("Getting global preferences (no DID set) without allowNullDID set to false is forbidden!");

    await this.storage.deleteSetting(did, "prefservice", "preferences");
  }

  public async developerModeEnabled(did: string): Promise<boolean> {
    try {
      let devMode = await this.getPreference(did, "developer.mode");
      if (devMode)
        return true;
      else
        return false;
    }
    catch (err) {
      return false;
    }
  }

  public getPublishIdentityMedium(did: string): Promise<string> {
    return this.getPreference<string>(did, "privacy.identity.publication.medium");
  }

  public setPublishIdentityMedium(did: string, medium: 'assist' | 'wallet'): Promise<void> {
    return this.setPreference(did, "privacy.identity.publication.medium", medium);
  }

  public getSendStatsToCredentialToolbox(did: string): Promise<boolean> {
    return this.getPreference<boolean>(did, "privacy.credentialtoolbox.stats");
  }

  public setSendStatsToCredentialToolbox(did: string, sendStats: boolean): Promise<void> {
    return this.setPreference(did, "privacy.credentialtoolbox.stats", sendStats);
  }

  public getUseHiveSync(did: string): Promise<boolean> {
    return this.getPreference<boolean>(did, "privacy.hive.sync");
  }

  public async setUseHiveSync(did: string, useHiveSync: boolean): Promise<void> {
    await this.setPreference(did, "privacy.hive.sync", useHiveSync);
    this.useHiveSync.next(useHiveSync);
  }
}
