import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { IdentityEntry } from '../model/didsessions/identityentry';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { NetworkTemplateStore } from './stores/networktemplate.store';

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

  constructor(private storage: GlobalStorageService, private platform: Platform) {
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
    // By default, because of app store policy reasons, android uses the built in browser,
    // while ios uses external browsers to open urls.
    const useBuiltInBrowser = this.platform.platforms().indexOf('android') >= 0 ? true : false;

    return {
      "locale.language": "native system",
      "developer.mode": false,
      "developer.install.verifyDigest": false,
      "developer.backgroundservices.startonboot": true,
      "developer.screencapture": false,
      "developer.collectLogs": false,
      "privacy.browser.usebuiltin": useBuiltInBrowser,
      "developer.core.mode": false, // Core developer mode, to access dev/tests screens
      "privacy.identity.publication.medium": "assist", // 'assist' or 'wallet'
      "privacy.credentialtoolbox.stats": true, // Publish anonymous stats about credentials usage, to the external credential toolbox service, or not
      "privacy.hive.sync": false, // Whether to allow data to be synchronized with the hive vault or not (credentials, contacts, etc)
      "ui.darkmode": true, // True for dark mode, false for light mode - legacy way to use binary light or dark modes (before colors). Now used to change the overall white or dark modes for pictures, in colored themes
      "ui.theme": "white", // Key of the main overall theme. Changing this theme also impacts the darkmode value. color code name eg: "blue"
      "ui.variant": "light", // light or dark. The variant changes the box colors mostly for now.
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
  public async preferenceIsSet(did: string, networkTemplate: string, key: string) {
    let diskPreferences = await this.storage.getSetting<AllPreferences>(did, networkTemplate, "prefservice", "preferences", {});
    return key in diskPreferences;
  }

  /**
   * Get a specific system preference. System preferences setting shared by all parts of the app.
   *
   * @param key Unique key identifying the preference data.
   */
  public async getPreference<T>(did: string, networkTemplate: string, key: string, allowNullDID = false): Promise<T> {
    if (did == null && !allowNullDID)
      throw new Error("Getting a global preference (no DID set) without allowNullDID set to false is forbidden! key= " + key);

    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference " + key + " is not a registered preference!");

    let preferences = await this.getPreferences(did, networkTemplate, allowNullDID);
    if (!(key in preferences))
      throw new Error("Preference " + key + " is not a registered preference!");

    //Logger.log('PreferenceService', "GET PREF", key, preferences[key])

    return preferences[key];
  }

  /**
   * Get all system preferences.
   */
  public async getPreferences(did: string, networkTemplate: string, allowNullDID = false): Promise<AllPreferences> {
    if (did == null && !allowNullDID)
      throw new Error("Getting global preferences (no DID set) without allowNullDID set to false is forbidden!");

    let diskPreferences = await this.storage.getSetting<AllPreferences>(did, networkTemplate, "prefservice", "preferences", {});

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
  public async setPreference(did: string, networkTemplate: string, key: string, value: any, allowNullDID = false): Promise<void> {
    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference " + key + " is not a registered preference!");

    let preferences = await this.getPreferences(did, networkTemplate, allowNullDID);
    preferences[key] = value;

    await this.storage.setSetting<AllPreferences>(did, networkTemplate, "prefservice", "preferences", preferences);

    // Notify listeners about a preference change
    this.preferenceListener.next({ key, value });
  }

  /**
   * Delete all system preferences.
   * Call this when the did is deleted.
   */
  public async deletePreferences(did: string, networkTemplate: string, allowNullDID = false) {
    if (did == null && !allowNullDID)
      throw new Error("Getting global preferences (no DID set) without allowNullDID set to false is forbidden!");

    await this.storage.deleteSetting(did, networkTemplate, "prefservice", "preferences");
  }

  public async developerModeEnabled(did: string, networkTemplate: string): Promise<boolean> {
    try {
      let devMode = await this.getPreference(did, networkTemplate, "developer.mode");
      if (devMode)
        return true;
      else
        return false;
    }
    catch (err) {
      return false;
    }
  }

  public getUseBuiltInBrowser(did: string, networkTemplate: string): Promise<boolean> {
    return this.getPreference<boolean>(did, networkTemplate, "privacy.browser.usebuiltin");
  }

  public setUseBuiltInBrowser(did: string, networkTemplate: string, useBuiltIn: boolean): Promise<void> {
    return this.setPreference(did, networkTemplate, "privacy.browser.usebuiltin", useBuiltIn);
  }

  /**
   * Developer mode is for external developers that are using essentials to build their dapps.
   * Core developer mode is for essentials developers or testers.
   */
  public coreDeveloperModeEnabled(did: string, networkTemplate: string): Promise<boolean> {
    return this.getPreference<boolean>(did, networkTemplate, "developer.core.mode");
  }

  public setCoreDeveloperModeEnabled(did: string, networkTemplate: string, enabled: boolean): Promise<void> {
    return this.setPreference(did, networkTemplate, "developer.core.mode", enabled);
  }

  public getPublishIdentityMedium(did: string, networkTemplate: string): Promise<string> {
    return this.getPreference<string>(did, networkTemplate, "privacy.identity.publication.medium");
  }

  public setPublishIdentityMedium(did: string, networkTemplate: string, medium: 'assist' | 'wallet'): Promise<void> {
    return this.setPreference(did, networkTemplate, "privacy.identity.publication.medium", medium);
  }

  public getSendStatsToCredentialToolbox(did: string, networkTemplate: string): Promise<boolean> {
    return this.getPreference<boolean>(did, networkTemplate, "privacy.credentialtoolbox.stats");
  }

  public setSendStatsToCredentialToolbox(did: string, networkTemplate: string, sendStats: boolean): Promise<void> {
    return this.setPreference(did, networkTemplate, "privacy.credentialtoolbox.stats", sendStats);
  }

  public getCollectLogs(did: string, networkTemplate: string = NetworkTemplateStore.networkTemplate): Promise<boolean> {
    return this.getPreference<boolean>(did, networkTemplate, "developer.collectLogs");
  }

  public setCollectLogs(did: string, networkTemplate: string, collectLogs: boolean): Promise<void> {
    return this.setPreference(did, networkTemplate, "developer.collectLogs", collectLogs);
  }

  public getUseHiveSync(did: string, networkTemplate: string = NetworkTemplateStore.networkTemplate): Promise<boolean> {
    return this.getPreference<boolean>(did, networkTemplate, "privacy.hive.sync");
  }

  public async setUseHiveSync(did: string, networkTemplate: string, useHiveSync: boolean): Promise<void> {
    await this.setPreference(did, networkTemplate, "privacy.hive.sync", useHiveSync);
    this.useHiveSync.next(useHiveSync);
  }
}
