import { Injectable } from '@angular/core';

import { DidService } from './did.service';
import { Contact } from '../models/contact.model';
import { FriendsService } from './friends.service';
import { Hive } from '@elastosfoundation/elastos-connectivity-sdk-cordova';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { HiveDataSync } from 'src/app/model/hive/hivedatasync';
import { GlobalStorageService } from 'src/app/services/global.storage.service';

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private backupRestoreHelper: HiveDataSync;
  private userVault: HivePlugin.Vault;

  public restoredContacts: Contact[] = [];

  constructor(
    private events: Events,
    private didService: DidService,
    private globalHiveService: GlobalHiveService,
    private globalStorage: GlobalStorageService,
    private friendsService: FriendsService,
  ) { }

  async init() {
    this.events.subscribe("backup:contact", (contact) => {
      void this.upsertDatabaseEntry('contacts', contact.id, contact);
    });
    this.events.subscribe("backup:deleteContact", (contact) => {
      void this.deleteDatabaseEntry('contacts', contact.id);
    });

    try {
      const hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
      if (!hiveAuthHelper) {
        Logger.log("contacts", "Failed to get hive auth helper. Backup service not starting for now");
        return;
      }

      const hiveClient = await this.globalHiveService.getHiveClient();
      Logger.log("contacts", "Hive client initialization complete");

      const userDID = await this.didService.getSignedIdentity();

      // did:elastos:iaMPKSkYLJYmbBTuT3JfF9E8cFtLWky5vk - Test

      Logger.log("contacts", "Getting current user's vault instance");
      this.userVault = await hiveClient.getVault(userDID); // No response here

      if (!this.userVault) {
        Logger.log("contacts", "Failed to get user's vault. Maybe none if configured yet. Backup service not starting for now");
        return;
      }

      Logger.log("contacts", "User vault retrieved. Now creating a new backup restore helper instance", this.userVault);

      this.backupRestoreHelper = new HiveDataSync(this.userVault, this.globalStorage, true);

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

      //await this.backupRestoreHelper.wipeLocalContextData("contacts"); // TMP DEBUG

      Logger.log("contacts", "Starting backup restore sync");
      await this.backupRestoreHelper.sync();
    } catch (e) {
      // We could get a hive exception here
      Logger.error("contacts", "Catched exception during backup service initialization:");
      Logger.error("contacts", e);
    }
  }

  async addContactEntryLocally(data: Contact) {
    Logger.log("contacts", 'Checking if backup data needs to be added', data);
    this.restoredContacts.push(data);

    const contactId = data.id;
    const targetContact = this.friendsService.contacts.find((contact) => contact.id === contactId);
    if (!targetContact) {
      Logger.log("contacts", 'Backup data needs to be added', data);
      await this.addContact(data);
    }
  }

  addContact(data: Contact): Promise<void> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(async () => {
        this.friendsService.safeAddContact(data);
        await this.friendsService.saveContactsState();

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

    this.friendsService.contacts.map((contact) => {
      if (contact.id === data.id) {
        contact = data;
      }
    });

    await this.friendsService.saveContactsState();
  }

  async deleteContactEntryLocally(contactId: string): Promise<void> {
    this.restoredContacts = this.restoredContacts.filter((contact) => contact.id !== contactId);
    this.friendsService.contacts = this.friendsService.contacts.filter((contact) => contact.id !== contactId);
    await this.friendsService.saveContactsState();

    // Update home page contacts slide
    this.events.publish('friends:updateSlider');
  }

  async upsertDatabaseEntry(context: string, key: string, data: HivePlugin.JSONObject): Promise<void> {
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
