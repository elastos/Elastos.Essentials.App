import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { GlobalStorageService } from './global.storage.service';

export type AllPreferences = {[key:string]:any};

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalPreferencesService {
  public preferenceListener = new Subject<Preference<any>>();

  constructor(private storage: GlobalStorageService) {
  }

  private getDefaultPreferences(): AllPreferences {
    return {
      "locale.language": "native system",
      "developer.mode": false,
      "developer.install.verifyDigest": false,
      "developer.backgroundservices.startonboot": true,
      "ui.darkmode": false,
      "chain.network.type": "MainNet",
      "chain.network.config": "",
      "chain.network.configurl": "",
      "mainchain.rpcapi": "http://api.elastos.io:20336",
      "sidechain.id.rpcapi": "http://api.elastos.io:20606",
      "sidechain.eth.oracle": "http://api.elastos.io:20632",
      "sidechain.eth.apimisc": "http://api.elastos.io:20634",
      "sidechain.eth.rpcapi": "http://api.elastos.io:20636",
      "trinitycli.runaddress": ""
    };
  }

  /**
   * Get a specific system preference. System preferences setting shared by all parts of the app.
   *
   * @param key Unique key identifying the preference data.
   */
  public async getPreference<T>(did: string, key: string, allowNullDID: boolean = false): Promise<T> {
    if (did == null && !allowNullDID)
      throw new Error("Getting a global preference (no DID set) without allowNullDID set to false is forbidden! key= "+key);

    let preferences = await this.getPreferences(did, allowNullDID);
    if (!(key in preferences))
      throw new Error("Preference "+key+" is not a registered preference!");

    //console.log("GET PREF", key, preferences[key])

    return preferences[key];
  }

  /**
   * Get all system preferences.
   */
  public async getPreferences(did: string, allowNullDID: boolean = false): Promise <AllPreferences> {
    if (did == null && !allowNullDID)
      throw new Error("Getting global preferences (no DID set) without allowNullDID set to false is forbidden!");

    let diskPreferences = await this.storage.getSetting<AllPreferences>(did, "prefservice", "preferences", {});

    //console.log("DISK PREFS", did, diskPreferences)

    // Merge saved preferences with default values
    return Object.assign({}, this.getDefaultPreferences(), diskPreferences);
  }

  /**
   * Set specific system preference.
   *
   * @param key   Unique key identifying the preference data.
   * @param value The data to be stored. If null is passed, the preference is restored to system default value.
   */
  public async setPreference(did: string, key: string, value: any): Promise<void> {
    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference "+key+" is not a registered preference!");

    let preferences = await this.getPreferences(did);
    preferences[key] = value;

    await this.storage.setSetting<AllPreferences>(did, "prefservice", "preferences", preferences);

    // Notify listeners about a preference change
    this.preferenceListener.next({key, value});
  }
}
