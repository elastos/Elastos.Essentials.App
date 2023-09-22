import { Injectable } from '@angular/core';
import type { Vault } from '@elastosfoundation/hive-js-sdk';
import { Subscription } from 'rxjs';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { Logger } from 'src/app/logger';
import { HiveDataSync } from 'src/app/model/hive/hivedatasync';
import { JSONObject } from 'src/app/model/json';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Contact } from '../models/contact.model';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private backupRestoreHelper: HiveDataSync;
  private vaultServices: Vault;

  public restoredContacts: Contact[] = [];

  private contactSub: Subscription = null;
  private deleteContactSub: Subscription = null;
  private useHiveSyncSub: Subscription = null;

  constructor(
    private events: GlobalEvents,
    private globalHiveService: GlobalHiveService,
    private friendsService: FriendsService,
    private prefs: GlobalPreferencesService
  ) { }

  async init() {
    this.contactSub = this.events.subscribe("backup:contact", (contact) => {
      void this.upsertDatabaseEntry('contacts', contact.id, contact);
    });

    this.deleteContactSub = this.events.subscribe("backup:deleteContact", (contact) => {
      void this.deleteDatabaseEntry('contacts', contact.id);
    });

    try {
      const hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
      if (!hiveAuthHelper) {
        Logger.log("contacts", "Failed to get hive auth helper. Backup service not starting for now");
        return;
      }

      // did:elastos:iaMPKSkYLJYmbBTuT3JfF9E8cFtLWky5vk - Test
      this.vaultServices = await this.globalHiveService.getActiveUserVaultServices();
      if (!this.vaultServices) {
        Logger.log("contacts", "Failed to get user's vault. Maybe none if configured yet. Backup service not starting for now");
        return;
      }

      Logger.log("contacts", "User vault retrieved. Now creating a new backup restore helper instance", this.vaultServices);

      this.backupRestoreHelper = new HiveDataSync(this.vaultServices, false, true);

      this.restoredContacts = [];
      this.backupRestoreHelper.addSyncContext("contacts",
        async (entry) => {
          // Add backup locally
          Logger.log("contacts", "Addition request from backup helper", entry);
          await this.addContactEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Modify backup locally
          Logger.log("contacts", "Modify request from the backup helper", entry);
          await this.modifyContactEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Delete backup locally
          Logger.log("contacts", "Deletion request from the backup helper", entry);
          await this.deleteContactEntryLocally(entry.data.id);
          return true;
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.useHiveSyncSub = this.prefs.useHiveSync.subscribe(async useHiveSync => {
        Logger.log("contacts", "Use hive sync status changed:", useHiveSync);

        if (this.backupRestoreHelper) {
            this.backupRestoreHelper.setSynchronizationEnabled(useHiveSync);
            if (useHiveSync) {
              Logger.log("contacts", "Starting backup restore sync");
              await this.backupRestoreHelper.sync();
            }
            else {
              this.backupRestoreHelper.stop();
            }
        }
      });

      //await this.backupRestoreHelper.wipeLocalContextData("contacts"); // TMP DEBUG
    } catch (e) {
      // We could get a hive exception here
      Logger.error("contacts", "Catched exception during backup service initialization:");
      Logger.error("contacts", e);
    }
  }

  public stop() {
    if (this.contactSub) {
      this.contactSub.unsubscribe();
      this.contactSub = null;
    }

    if (this.deleteContactSub) {
      this.deleteContactSub.unsubscribe();
      this.deleteContactSub = null;
    }

    if (this.useHiveSyncSub) {
      this.useHiveSyncSub.unsubscribe();
      this.useHiveSyncSub = null;
    }
  }

  async addContactEntryLocally(data: Contact) {
    Logger.log("contacts", 'Checking if backup data needs to be added', data);
    this.restoredContacts.push(data);

    const contactId = data.id;
    const targetContact = this.friendsService.contacts.value.find((contact) => contact.id === contactId);
    if (!targetContact) {
      Logger.log("contacts", 'Backup data needs to be added', data);
      await this.addContact(data);
    }
  }

  addContact(data: Contact): Promise<void> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(async () => {
        await this.friendsService.safeAddContact(data);

        // Update home page contacts slide
        this.events.publish('friends:updateSlider');
        resolve();
      }, 1000);
    })
  }

  async modifyContactEntryLocally(data: Contact): Promise<void> {
    this.restoredContacts.map((contact) => {
      if (contact.id === data.id) {
        contact = data;
      }
    });

    this.friendsService.contacts.value.map((contact) => {
      if (contact.id === data.id) {
        contact = data;
      }
    });

    await this.friendsService.storeContacts();
  }

  async deleteContactEntryLocally(contactId: string): Promise<void> {
    this.restoredContacts = this.restoredContacts.filter((contact) => contact.id !== contactId);

    let contact = this.friendsService.getContact(contactId);
    await this.friendsService.deleteContact(contact, false)

    // Update home page contacts slide
    this.events.publish('friends:updateSlider');
  }

  async upsertDatabaseEntry(context: string, key: string, data: JSONObject): Promise<void> {
    try {
      Logger.log("contacts", 'Local restored contacts', this.restoredContacts);
      Logger.log("contacts", 'upsertDatabaseEntry called for entry', context, key);
      await this.backupRestoreHelper.upsertDatabaseEntry(context, key, data);
    } catch (e) {
      Logger.error("contacts", 'BackupService upsertDatabaseEntry error:', e);
    }
  }

  async deleteDatabaseEntry(contextName: string, key: string): Promise<void> {
    try {
      Logger.log("contacts", 'Backup restored contacts', this.restoredContacts);
      Logger.log("contacts", 'deleteDatabaseEntry called for entry', contextName, key);
      await this.backupRestoreHelper.deleteDatabaseEntry(contextName, key);
    } catch (e) {
      Logger.error("contacts", 'BackupService deleteDatabaseEntry error:', e);
    }
  }
}
