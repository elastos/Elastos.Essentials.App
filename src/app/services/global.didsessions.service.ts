import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { GlobalStorageService } from './global.storage.service';
import { Direction, GlobalNavService } from './global.nav.service';
import { GlobalServiceManager } from './global.service.manager';
import { GlobalIntentService } from './global.intent.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from './global.elastosapi.service';

declare let internalManager: InternalPlugin.InternalManager;
declare let didManager: DIDPlugin.DIDManager;

export type IdentityAvatar = {
  /** Picture content type: "image/jpeg" or "image/png" */
  contentType: string;
  /** Raw picture bytes encoded to a base64 string */
  base64ImageData: string;
}

export type IdentityEntry = {
  /** ID of the DID store that containes this DID entry */
  didStoreId: string;
  /** DID string (ex: did:elastos:abcdef) */
  didString: string;
  /** Identity entry display name, set by the user */
  name: string;
  /** Optional profile picture for this identity */
  avatar?: IdentityAvatar;
  /** DID data storage path, for save did data and the other module data, such as spv */
  didStoragePath: string;
}

/**
* Option parameters that can be passed during the sign in operation.
*/
export type SignInOptions = {
  /** Suggested session langauge code to use? */
  sessionLanguage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalDIDSessionsService {
  private identities: IdentityEntry[] = null;
  private signedInIdentity: IdentityEntry | null = null;

  public static signedInDIDString: string | null = null; // Convenient way to get the signed in user's DID, used in many places

  constructor(private storage: GlobalStorageService,
    private globalNavService: GlobalNavService,
    private prefs: GlobalPreferencesService,
    private globalElastosAPIService: GlobalElastosAPIService,
    private globalIntentService: GlobalIntentService) {
  }

  public async init(): Promise<void> {
    Logger.log("DIDSessionsService", "Initializating the DID Sessions service");

    this.identities = await this.storage.getSetting<IdentityEntry[]>(null, "didsessions", "identities", []);
    let lastSignedInIdentity = await this.storage.getSetting<IdentityEntry>(null, "didsessions", "signedinidentity", null);
    if (lastSignedInIdentity) {
      let identity = this.identities.find(entry => lastSignedInIdentity.didString == entry.didString);
      if (identity) {
        await this.signIn(identity);
        await this.navigateHome();
      }
    }

    this.setupDIDResolver();
  }

  public saveDidSessionsToDisk(): Promise<void> {
    return this.storage.setSetting(null, "didsessions", "identities", this.identities);
  }

  public saveSignedInIdentityToDisk(): Promise<void> {
    return this.storage.setSetting(null, "didsessions", "signedinidentity", this.signedInIdentity);
  }

  private getIdentityIndex(didString: string): number {
    return this.identities.findIndex((i) => didString === i.didString);
  }

  private deleteIdentityEntryIfExists(didString: string) {
    let existingIdentityIndex = this.getIdentityIndex(didString);
    if (existingIdentityIndex != -1)
      this.identities.splice(existingIdentityIndex, 1);
  }

  /**
   * Inserts a new identity entry and saves it permanently.
   *
   * In case an entry with the same DID store ID and DID string already exists, the existing
   * entry is updated.
   */
  public async addIdentityEntry(entry: IdentityEntry): Promise<void> {
    // Delete before adding again (update)
    this.deleteIdentityEntryIfExists(entry.didString);

    // Add again
    this.identities.push(entry);

    await this.saveDidSessionsToDisk();
  }

  /**
   * Deletes a previously added identity entry.
   */
  public async deleteIdentityEntry(didString: string): Promise<void> {
    this.deleteIdentityEntryIfExists(didString);

    await this.saveDidSessionsToDisk();
  }

  /**
   * Gets the list of all identity entries previously created.
   */
  public getIdentityEntries(): IdentityEntry[] {
    return this.identities;
  }

  /**
   * Gets the signed in identity.
   *
   * @returns The signed in identity if any, null otherwise.
   */
  public getSignedInIdentity(): IdentityEntry | null {
    return this.signedInIdentity;
  }

  /**
   * Signs a given identity entry in.
   *
   * This identity becomes the new global identity for the "DID Session".
   */
  public async signIn(entry: IdentityEntry, options?: SignInOptions): Promise<void> {
    Logger.log('DIDSessionsService', "Signing in with DID", entry.didString, entry.name);

    if (entry.didStoragePath == null) {
      await internalManager.changeOldPath(entry.didStoreId, entry.didString);
      entry.didStoragePath = await internalManager.getDidStoragePath(entry.didStoreId, entry.didString);
      await this.saveDidSessionsToDisk();
    }

    this.signedInIdentity = entry;

    GlobalDIDSessionsService.signedInDIDString = this.signedInIdentity.didString;

    await GlobalServiceManager.getInstance().emitUserSignIn(this.signedInIdentity);

    await this.saveSignedInIdentityToDisk();

    Logger.log('DIDSessionsService', "Sign in completed");
  }

  /**
   * Goes to launcher. A user must be signed in prior to this call.
   */
  public navigateHome(): Promise<boolean> {
    if (!this.signedInIdentity)
      throw new Error("DID Sessions cannot navigate to essentials home screen as there is no user signed in yet");

    return this.globalNavService.navigateHome(Direction.FORWARD);
  }

  /**
   * Signs the active identity out. All opened dApps are closed as there is no more active DID session.
   */
  public async signOut(): Promise<void> {
    Logger.log('DIDSessionsService', "Signing out");

    this.signedInIdentity = null;
    GlobalDIDSessionsService.signedInDIDString = null;

    await this.saveSignedInIdentityToDisk();

    // clear the last intent
    this.globalIntentService.clear();

    await GlobalServiceManager.getInstance().emitUserSignOut();
    await this.globalNavService.navigateDIDSessionHome();
  }

  /**
   * Tells whether the user has backed up his identity or not.
   */
  public activeIdentityWasBackedUp(): Promise<boolean> {
    return this.storage.getSetting(this.getSignedInIdentity().didString, "didsessions", "identitybackedup", false);
  }

  public async markActiveIdentityBackedUp(): Promise<void> {
    await this.storage.setSetting(this.getSignedInIdentity().didString, "didsessions", "identitybackedup", true);
  }

  /**
   * Globally, updates plugins to use a different DID resolver depending on which Elastos API provider is used.
   * This can happen when a different user signs in (has a different elastos api provider in preferences) or when
   * the same user manually changes his elastos api provider from settings.
   */
  private setupDIDResolver() {
    this.globalElastosAPIService.activeProvider.subscribe((provider) => {
      let didResolverUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.EID_RPC);
      Logger.log('DIDSessionsService', 'Changing DID plugin resolver to :', didResolverUrl);
      didManager.setResolverUrl(didResolverUrl, () => {
      }, (err) => {
          Logger.error('DIDSessionsService', 'didplugin setResolverUrl error:', err);
      });
    });
  }
}
