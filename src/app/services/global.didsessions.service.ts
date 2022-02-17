import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Logger } from '../logger';
import { GlobalIntentService } from './global.intent.service';
import { GlobalNativeService } from './global.native.service';
import { Direction, GlobalNavService } from './global.nav.service';
import { GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { MigrationService } from './migrator/migration.service';

declare let internalManager: InternalPlugin.InternalManager;

export type IdentityAvatar = {
  /** Picture content type: "image/jpeg" or "image/png" */
  contentType: string;
  /** Raw picture bytes encoded to a base64 string */
  base64ImageData: string;
}

export type IdentityEntry = {
  /** ID of the DID store that contains this DID entry */
  didStoreId: string;
  /** DID string (ex: did:elastos:abcdef) */
  didString: string;
  /** Identity entry display name, set by the user */
  name: string;
  /** Optional profile picture for this identity */
  avatar?: IdentityAvatar;
  /** DID data storage path, for save did data and the other module data, such as spv */
  didStoragePath: string;
  /** Date at which this identity entry was created. NOTE: some old sessions don't have this info */
  creationDate?: number;
}

/**
* Option parameters that can be passed during the sign in operation.
*/
export type SignInOptions = {
  /** Suggested session language code to use? */
  sessionLanguage?: string;
  showBlockingSignInDialog?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalDIDSessionsService {
  public static instance: GlobalDIDSessionsService = null;

  private identities: IdentityEntry[] = null;
  private signedInIdentity: IdentityEntry | null = null;

  public static signedInDIDString: string | null = null; // Convenient way to get the signed in user's DID, used in many places

  constructor(private storage: GlobalStorageService,
    private migrationService: MigrationService,
    private globalNavService: GlobalNavService,
    private globalIntentService: GlobalIntentService,
    public globalNativeService: GlobalNativeService,
    public translate: TranslateService,
  ) {
    GlobalDIDSessionsService.instance = this;
  }

  public async init(): Promise<void> {
    Logger.log("DIDSessionsService", "Initializating the DID Sessions service");

    this.identities = await this.storage.getSetting<IdentityEntry[]>(null, "didsessions", "identities", []);
    let lastSignedInIdentity = await this.storage.getSetting<IdentityEntry>(null, "didsessions", "signedinidentity", null);
    if (lastSignedInIdentity) {
      let identity = this.identities.find(entry => lastSignedInIdentity.didString == entry.didString);
      if (identity) {
        await this.signIn(identity);
      }
    }
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
    if (this.getIdentityIndex(entry.didString) >= 0) {
      // Delete before adding again (update)
      this.deleteIdentityEntryIfExists(entry.didString);
    }
    else {
      // Real DID creation
      // Let the migration service know about this newly created session
      await this.migrationService.onDIDSessionCreated(entry.didString);
    }

    // Save the session creation date
    if (!entry.creationDate) {
      entry.creationDate = moment().unix(); // Just creating: session creation date is now.
    }

    // Add again
    this.identities.push(entry);

    await this.saveDidSessionsToDisk();

    // If we are modifying the signed in identity (ex: avatar), we update our local cache
    if (this.signedInIdentity && this.signedInIdentity.didString === entry.didString) {
      this.signedInIdentity = entry;
    }
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

  public getIdentityEntry(did: string): IdentityEntry {
    return this.identities.find(i => i.didString === did);
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
    } else {
      // TODO: The NSHomeDirectory() will change after reinstall app in iOS.
      // so we need to update the didStoragePath.
      entry.didStoragePath = await internalManager.getDidStoragePath(entry.didStoreId, entry.didString);
    }

    // Fix session creation date: old accounts don't have one.
    if (!entry.creationDate) {
      // Set the creation date to "now" even if that's not really the case.
      entry.creationDate = moment().unix();
      await this.saveDidSessionsToDisk();
    }

    // Check if some migrations are due - fully block the process and UI until all
    // migrations are fully completed
    await this.migrationService.checkAndNavigateToMigration(entry);

    this.signedInIdentity = entry;

    GlobalDIDSessionsService.signedInDIDString = this.signedInIdentity.didString;

    void this.globalNativeService.showLoading(this.translate.instant("didsessions.prepare.sign-in-title"));
    await GlobalServiceManager.getInstance().emitUserSignIn(this.signedInIdentity);
    void this.globalNativeService.hideLoading();

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

    // Call this before setting the signed in did to null, because signing out operations may require it.
    await GlobalServiceManager.getInstance().emitUserSignOut();

    this.signedInIdentity = null;
    GlobalDIDSessionsService.signedInDIDString = null;

    await this.saveSignedInIdentityToDisk();

    // clear the last intent
    this.globalIntentService.clear();

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
}
