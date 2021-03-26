import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { NetworkType } from '../model/networktype';
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
  public static instance: GlobalPreferencesService;  // Convenient way to get this service from non-injected classes

  public preferenceListener = new Subject<Preference<any>>();

  constructor(private storage: GlobalStorageService) {
    GlobalPreferencesService.instance = this;
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
      "mainchain.rpcapi": "https://api.elastos.io/ela",
      "sidechain.id.rpcapi": "https://api.elastos.io/did",
      "sidechain.eth.oracle": "https://api.elastos.io/oracle",
      "sidechain.eth.apimisc": "https://api.elastos.io/misc",
      "sidechain.eth.rpcapi": "https://api.elastos.io/eth",
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

    //Logger.log('PreferenceService', "GET PREF", key, preferences[key])

    return preferences[key];
  }

  /**
   * Get all system preferences.
   */
  public async getPreferences(did: string, allowNullDID: boolean = false): Promise <AllPreferences> {
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
  public async setPreference(did: string, key: string, value: any, allowNullDID: boolean = false): Promise<void> {
    if (!(key in this.getDefaultPreferences()))
      throw new Error("Preference "+key+" is not a registered preference!");

    let preferences = await this.getPreferences(did, allowNullDID);
    preferences[key] = value;

    await this.storage.setSetting<AllPreferences>(did, "prefservice", "preferences", preferences);

    // Notify listeners about a preference change
    this.preferenceListener.next({key, value});
  }

  /**
   * Returns the currently active network such as mainnet or testnet.
   */
  public getActiveNetworkType(did: string): Promise<NetworkType> {
    return this.getPreference<NetworkType>(did, "chain.network.type");
  }

  public getMainchainRPCApiEndpoint(did: string): Promise<string> {
    return this.getPreference<string>(did, "mainchain.rpcapi");
  }

  public getETHSidechainRPCApiEndpoint(did: string): Promise<string> {
    return this.getPreference<string>(did, "sidechain.eth.rpcapi");
  }
}
