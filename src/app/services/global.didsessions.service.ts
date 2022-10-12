import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { IdentityEntry } from '../model/didsessions/identityentry';
import { GlobalFirebaseService } from './global.firebase.service';
import { GlobalIntentService } from './global.intent.service';
import { GlobalNativeService } from './global.native.service';
import { Direction, GlobalNavService } from './global.nav.service';
import { GlobalNetworksService, MAINNET_TEMPLATE } from './global.networks.service';
import { GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { MigrationService } from './migrator/migration.service';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';

declare let internalManager: InternalPlugin.InternalManager;

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

  public activeIdentityBackedUp = new BehaviorSubject<boolean>(true); // Whether the active identity is backed up or not. Tru by default whilte loading, to now show any false backup prompt to users.

  constructor(private storage: GlobalStorageService,
    private migrationService: MigrationService,
    private globalNavService: GlobalNavService,
    private globalNetworkService: GlobalNetworksService,
    private globalIntentService: GlobalIntentService,
    public globalNativeService: GlobalNativeService,
    public translate: TranslateService,
  ) {
    GlobalDIDSessionsService.instance = this;
  }

  public async init(): Promise<void> {
    Logger.log("DIDSessionsService", "Initializating the DID Sessions service");

    this.identities = await this.storage.getSetting<IdentityEntry[]>(null, null, "didsessions", this.storageKeyForNetworkTemplate("identities"), []);
    let lastSignedInIdentity = await this.storage.getSetting<IdentityEntry>(null, null, "didsessions", "signedinidentity", null);
    if (lastSignedInIdentity) {
      let identity = this.identities.find(entry => lastSignedInIdentity.didString == entry.didString);
      if (identity) {
        await this.signIn(identity);
      }
    }
  }

  public saveDidSessionsToDisk(): Promise<void> {
    return this.storage.setSetting(null, null, "didsessions", this.storageKeyForNetworkTemplate("identities"), this.identities);
  }

  public saveSignedInIdentityToDisk(): Promise<void> {
    return this.storage.setSetting(null, null, "didsessions", "signedinidentity", this.signedInIdentity);
  }

  /**
   * Returns the sandboxed storage session for the active network template.
   * For backward compatibility, mainnet network template uses old style storage keys (no network suffix).
   */
  private storageKeyForNetworkTemplate(key: string) {
    if (this.globalNetworkService.activeNetworkTemplate.value === MAINNET_TEMPLATE)
      return key;
    else
      return key + "_" + this.globalNetworkService.activeNetworkTemplate.value;
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
   * Signs a given identity entry in. No navigation change occurs here but all services listening to the
   * DID change event do initialize themselves ("onUserSignIn").
   *
   * This identity becomes the new global identity for the "DID Session".
   */
  public async signIn(entry: IdentityEntry, options?: SignInOptions): Promise<void> {
    Logger.log('DIDSessionsService', "Signing in with DID", entry.didString, entry.name);

    GlobalFirebaseService.instance.logEvent("did_sign_in");

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

    DIDSessionsStore.signedInDIDString = this.signedInIdentity.didString;

    if (!options || options.showBlockingSignInDialog)
      await this.globalNativeService.showLoading(this.translate.instant("didsessions.prepare.sign-in-title"));

    await GlobalServiceManager.getInstance().emitUserSignIn(this.signedInIdentity);

    if (!options || options.showBlockingSignInDialog)
      void this.globalNativeService.hideLoading();

    await this.saveSignedInIdentityToDisk();

    void this.activeIdentityWasBackedUp().then(wasBackedUp => this.activeIdentityBackedUp.next(wasBackedUp));

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
    DIDSessionsStore.signedInDIDString = null;

    await this.saveSignedInIdentityToDisk();

    // clear the last intent
    this.globalIntentService.clear();

    // Reset backedup flag
    this.activeIdentityBackedUp.next(true);

    await this.globalNavService.navigateDIDSessionHome();
  }

  /**
   * Tells whether the user has backed up his identity or not.
   */
  public activeIdentityWasBackedUp(): Promise<boolean> {
    return this.storage.getSetting(this.getSignedInIdentity().didString, NetworkTemplateStore.networkTemplate, "didsessions", "identitybackedup", false);
  }

  public async markActiveIdentityBackedUp(): Promise<void> {
    this.activeIdentityBackedUp.next(true);
    await this.storage.setSetting(this.getSignedInIdentity().didString, NetworkTemplateStore.networkTemplate, "didsessions", "identitybackedup", true);
  }
}
