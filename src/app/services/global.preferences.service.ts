import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { GlobalStorageService } from './global.storage.service';

export type AllPreferences = { [key: string]: any };

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalPreferencesService {
  public static instance: GlobalPreferencesService;  // Convenient way to get this service from non-injected classes

  public preferenceListener = new Subject<Preference<any>>();

  constructor(private storage: GlobalStorageService, private platform: Platform) {
    GlobalPreferencesService.instance = this;
  }

  private getDefaultPreferences(): AllPreferences {
    // By default, because of app store policy reasons, android uses the built in browser,
    // while ios uses external browsers to open urls.
    const useBuiltInBrowser = this.platform.platforms().indexOf('android') >= 0 ? true : false;

    return {
      "locale.language": "native system",
      "developer.mode": false,
      "developer.install.verifyDigest": false,
      "developer.backgroundservices.startonboot": true,
      "developer.screencapture": false,
      "privacy.browser.usebuiltin": useBuiltInBrowser,
      "privacy.identity.publication.medium": "assist", // 'assist' or 'wallet'
      "privacy.credentialtoolbox.stats": true, // Publish anonymous stats about credentials usage, to the external credential toolbox service, or not
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

  public getUseBuiltInBrowser(did: string): Promise<boolean> {
    return this.getPreference<boolean>(did, "privacy.browser.usebuiltin");
  }

  public setUseBuiltInBrowser(did: string, useBuiltIn: boolean): Promise<void> {
    return this.setPreference(did, "privacy.browser.usebuiltin", useBuiltIn);
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
}
