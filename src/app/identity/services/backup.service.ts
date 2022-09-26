import { Injectable } from '@angular/core';
import { Vault } from '@elastosfoundation/hive-js-sdk';
import { Subscription } from 'rxjs';
import { sleep } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { HiveDataSync } from 'src/app/model/hive/hivedatasync';
import { JSONObject } from 'src/app/model/json';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { DIDURL } from '../model/didurl.model';
import { VerifiableCredential } from '../model/verifiablecredential.model';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';
import { DIDService } from './did.service';

declare let didManager: DIDPlugin.DIDManager;

const BACKUP_CONTEXT = "identitycredentials";

@Injectable({
  providedIn: 'root'
})
export class BackupService extends GlobalService {
  private backupRestoreHelper: HiveDataSync;
  private userVault: Vault;
  private credAddedSub: Subscription = null;
  private credModifiedSub: Subscription = null;
  private credDeletedSub: Subscription = null;
  private didActivatedSub: Subscription = null;
  private useHiveSyncSub: Subscription = null;

  private preparingOrPrepared = false;

  private signedIn = false;

  constructor(
    private events: GlobalEvents,
    private didService: DIDService,
    private globalHiveService: GlobalHiveService,
    private prefs: GlobalPreferencesService
  ) {
    super();
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Get notified when credentials are added in the local model
    this.credAddedSub = this.events.subscribe("did:credentialadded", (credentialID: string) => {
      let credential = this.didService.getActiveDid().getCredentialById(new DIDURL(credentialID));
      if (credential) {
        void this.upsertDatabaseEntry(credential.pluginVerifiableCredential);
      }
      else {
        Logger.warn("identitybackup", "Unable to find credential with ID", credentialID, "in local model. Not adding it for backup!");
      }
    });

    // Get notified when credentials are modified in the local model
    this.credModifiedSub = this.events.subscribe("did:credentialmodified", (credentialID: string) => {
      let credential = this.didService.getActiveDid().getCredentialById(new DIDURL(credentialID));
      if (credential) {
        void this.upsertDatabaseEntry(credential.pluginVerifiableCredential);
      }
      else {
        Logger.warn("identitybackup", "Unable to find credential with ID", credentialID, "in local model. Not updating it for backup!");
      }
    });

    // Get notified when credentials are deleted from the local model
    this.credDeletedSub = this.events.subscribe("did:credentialdeleted", (credentialID: string) => {
      void this.deleteDatabaseEntry(credentialID);
    });

    // Wait until the DID activation is complete, before doing any backup or restore operation
    this.preparingOrPrepared = false;
    this.didActivatedSub = this.didService.activatedDid.subscribe((activatedDID) => {
      if (activatedDID && activatedDID.getDIDString() === DIDSessionsStore.signedInDIDString) {
        Logger.log("identitybackup", "DID is activated, preparing the backup environment");

        void this.prepare();
      }
    });

    this.signedIn = true;

    return;
  }

  onUserSignOut(): Promise<void> {
    this.signedIn = false;
    if (this.credAddedSub)
      this.credAddedSub.unsubscribe();

    if (this.credModifiedSub)
      this.credModifiedSub.unsubscribe();

    if (this.credDeletedSub)
      this.credDeletedSub.unsubscribe();

    if (this.didActivatedSub)
      this.didActivatedSub.unsubscribe();

    if (this.backupRestoreHelper) {
      this.backupRestoreHelper.stop();
      this.backupRestoreHelper = null;
    }

    if (this.useHiveSyncSub) {
      this.useHiveSyncSub.unsubscribe();
      this.useHiveSyncSub = null;
    }

    this.preparingOrPrepared = false;

    return;
  }

  private async prepare() {
    // Make sure to not initialize things twice by mistake.
    if (this.preparingOrPrepared)
      return;

    this.preparingOrPrepared = true;

    // Don't start immediatelly at boot to not overload the boot sequence
    await sleep(10000);

    if (!this.signedIn) return; // In case the user sign out

    void this.globalHiveService.getActiveUserVaultServices().then(vaultServices => {
      try {
        this.userVault = vaultServices;

        Logger.log("identitybackup", "Getting current user's vault instance");

        if (!this.userVault) {
          Logger.log("identitybackup", "Failed to get user's vault. Maybe none if configured yet. Backup service not starting for now");
          return;
        }

        Logger.log("identitybackup", "User vault retrieved. Now creating a new backup restore helper instance", this.userVault);

        this.backupRestoreHelper = new HiveDataSync(this.userVault, false, true);

        this.backupRestoreHelper.addSyncContext(BACKUP_CONTEXT,
          async (entry) => {
            // Remote entry not existing locally - add it
            Logger.log("identitybackup", "Addition request from backup helper", entry);
            let credentialJSON: JSONObject = entry.data;
            try {
              let credential = didManager.VerifiableCredentialBuilder.fromJson(JSON.stringify(credentialJSON));
              if (credential) {
                await this.addCredentialEntryLocally(credential);
                return true;
              }
              else {
                Logger.warn("identitybackup", "Hive backup entry can't be converted to a credential, is is invalid? Skipping it permanently");
                return true;
              }
            }
            catch (e) {
              Logger.warn("identitybackup", "Hive backup entry can't be parsed to JSON, is is invalid? Skipping it permanently");
              return true;
            }

          }, async (entry) => {
            // Remote entry existing locally but modified more recently - update it
            Logger.log("identitybackup", "Modify request from the backup helper", entry);
            let credentialJSON: JSONObject = entry.data;
            let credential = didManager.VerifiableCredentialBuilder.fromJson(JSON.stringify(credentialJSON));
            if (credential) await this.modifyCredentialEntryLocally(credential);
            return true;

          }, async (entry) => {
            // Remote entry existing locally but deleted remotely - remove it
            Logger.log("identitybackup", "Deletion request from the backup helper", entry);
            await this.deleteCredentialEntryLocally(entry.data.id);
            return true;
          }
        );

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.useHiveSyncSub = this.prefs.useHiveSync.subscribe(async useHiveSync => {
          Logger.log("identitybackup", "Use hive sync status changed:", useHiveSync);

          this.backupRestoreHelper.setSynchronizationEnabled(useHiveSync);
          if (useHiveSync) {
            Logger.log("identitybackup", "Starting backup restore sync");
            await this.backupRestoreHelper.sync();
          }
          else {
            this.backupRestoreHelper.stop();
          }
        });
      } catch (e) {
        // We could get a hive exception here
        Logger.error("identitybackup", "Catched exception during backup service initialization:");
        Logger.error("identitybackup", e);
      }
    });
  }

  async addCredentialEntryLocally(credential: DIDPlugin.VerifiableCredential) {
    Logger.log("identitybackup", 'Adding new credential to local model (from backup)', credential);
    await this.didService.getActiveDid().upsertRawCredential(new VerifiableCredential(credential), true);
  }

  async modifyCredentialEntryLocally(credential: DIDPlugin.VerifiableCredential): Promise<void> {
    Logger.log("identitybackup", 'Updating existing credential in the local model (from backup)', credential);
    await this.didService.getActiveDid().upsertRawCredential(new VerifiableCredential(credential), true);
  }

  async deleteCredentialEntryLocally(credentialID: string): Promise<void> {
    Logger.log("identitybackup", 'Deleting credential from the local model (from backup)');
    await this.didService.getActiveDid().deleteCredential(new DIDURL(credentialID), true);

    // TODO: delete from DID document !

    return;
  }

  /**
   * Inserts or updates a credential that already exists in the current identity,
   * into the local backup storage. This credential is going to
   * be synced to Hive a bit later.
   */
  async upsertDatabaseEntry(credential: DIDPlugin.VerifiableCredential): Promise<void> {
    try {
      let credentialString = await credential.toString();
      let credentialJSON = JSON.parse(credentialString);
      Logger.log("identitybackup", 'upsertDatabaseEntry called for entry', credential, credentialString);
      await this.backupRestoreHelper.upsertDatabaseEntry(BACKUP_CONTEXT, credential.getFragment(), credentialJSON);
    } catch (e) {
      Logger.error("identitybackup", 'BackupService upsertDatabaseEntry error:', e);
    }
  }

  /**
   * Deletes a credential that existed in the current identity,
   * from the local backup storage. This credential is going to
   * be synced (deleted remotely too) to Hive a bit later.
   */
  async deleteDatabaseEntry(credentialID: string): Promise<void> {
    try {
      Logger.log("identitybackup", 'deleteDatabaseEntry called for entry', credentialID);
      await this.backupRestoreHelper.deleteDatabaseEntry(BACKUP_CONTEXT, new DIDURL(credentialID).getFragment());
    } catch (e) {
      Logger.error("identitybackup", 'BackupService deleteDatabaseEntry error:', e);
    }
    return;
  }
}
