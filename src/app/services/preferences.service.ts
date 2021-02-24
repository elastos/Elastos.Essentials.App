import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';

export type Preference<T> = {
  key: string;
  value: T;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  public preferenceListener = new Subject<Preference<any>>();

  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
    });
  }

  /**
   * Get a specific system preference. System preferences setting shared by all parts of the app.
   *
   * @param key Unique key identifying the preference data.
   */
  public getPreference<T>(key: string): Promise<T> {
    // TODO @chad: add a did parameter to simulate DID session context, as explained in the clickup task
    return null; // TODO @chad
  }

  /**
   * Get all system preferences.
   */
  public getPreferences(): Promise <Preference<any>[]> {
    // TODO @chad: add a did parameter to simulate DID session context, as explained in the clickup task
    return null; // TODO @chad
  }

  /**
   * Set specific system preference.
   *
   * @param key   Unique key identifying the preference data.
   * @param value The data to be stored. If null is passed, the preference is restored to system default value.
   */
  public async setPreference(key: string, value: any): Promise<void> {
    // TODO @chad: add a did parameter to simulate DID session context, as explained in the clickup task
    // TODO @chad

    // Notify listeners about a preference change
    this.preferenceListener.next({key, value});
  }
}
