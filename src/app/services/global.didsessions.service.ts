import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalStorageService } from './global.storage.service';
import { Direction, GlobalNavService } from './global.nav.service';
import { GlobalServiceManager } from './global.service.manager';
import { GlobalIntentService } from './global.intent.service';
import { NewIdentity } from '../didsessions/model/newidentity';

declare let internalManager: InternalPlugin.InternalManager;
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
  /** Keep the mnemonic info for after did creeated or import */
  mnemonicInfo?: NewIdentity;
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
    private globalIntentService: GlobalIntentService) {
  }

  public async init(): Promise<void> {
    Logger.log("DIDSessionsService", "Initializating the DID Sessions service");

    this.identities = await this.storage.getSetting<IdentityEntry[]>(null, "didsessions", "identities", []);
    let lastSignedInIdentity = await this.storage.getSetting<IdentityEntry>(null, "didsessions", "signedinidentity", null);
    if (lastSignedInIdentity) {
      let identity = this.identities.find(entry => lastSignedInIdentity.didString == entry.didString);
      if (identity) {
        this.signIn(identity);
      }
    }
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

    // Save to disk
    await this.storage.setSetting(null, "didsessions", "identities", this.identities);
  }

  /**
   * Deletes a previously added identity entry.
   */
  public async deleteIdentityEntry(didString: string): Promise<void> {
    this.deleteIdentityEntryIfExists(didString);

    // Save to disk
    await this.storage.setSetting(null, "didsessions", "identities", this.identities);
  }

  /**
   * Gets the list of all identity entries previously created.
   */
  public async getIdentityEntries(): Promise<IdentityEntry[]> {
    return this.identities;
  }

  /**
   * Gets the signed in identity.
   *
   * @returns The signed in identity if any, null otherwise.
   */
  public async getSignedInIdentity(): Promise<IdentityEntry | null> {
    return this.signedInIdentity;
  }

  /**
   * Signs a given identity entry in.
   *
   * This identity becomes the new global identity for the "DID Session".
   * All dApps get sandboxed in this DID context and don't see any information about the other available
   * identities.
   */
  public async signIn(entry: IdentityEntry, options?: SignInOptions): Promise<void> {
    Logger.log('DIDSessionsService', "Signing in with DID", entry.didString, entry.name);

    if (entry.didStoragePath == null) {
      await internalManager.changeOldPath(entry.didStoreId, entry.didString);
      entry.didStoragePath = await internalManager.getDidStoragePath(entry.didStoreId, entry.didString);
      await this.storage.setSetting(null, "didsessions", "identities", this.identities);
    }

    this.signedInIdentity = entry;

    GlobalDIDSessionsService.signedInDIDString = this.signedInIdentity.didString;

    // Save to disk
    await this.storage.setSetting(null, "didsessions", "signedinidentity", this.signedInIdentity);

    await GlobalServiceManager.getInstance().emitUserSignIn(this.signedInIdentity);

    //Go to launcher
    this.globalNavService.navigateHome(Direction.FORWARD);
  }

  /**
   * Signs the active identity out. All opened dApps are closed as there is no more active DID session.
   */
  public async signOut(): Promise<void> {
    Logger.log('DIDSessionsService', "Signing out");

    this.signedInIdentity = null;
    GlobalDIDSessionsService.signedInDIDString = null;

    // Save to disk
    await this.storage.setSetting(null, "didsessions", "signedinidentity", this.signedInIdentity);

    // clear the last intent
    this.globalIntentService.clear();

    await GlobalServiceManager.getInstance().emitUserSignOut();
    this.globalNavService.navigateDIDSessionHome();
  }
}
