import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import * as TrinitySDK from '@elastosfoundation/trinity-dapp-sdk';
import { DidService } from './did.service';
import { Contact } from '../models/contact.model';
import { FriendsService } from './friends.service';
import { Events } from './events.service';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  private backupRestoreHelper: TrinitySDK.Backup.BackupRestoreHelper;
  private userVault: HivePlugin.Vault;

  public restoredContacts: Contact[] = [];

  constructor(
    private translate: TranslateService,
    private events: Events,
    private didService: DidService,
    private friendsService: FriendsService
  ) { }

  async init() {
    this.events.subscribe("backup:contact", (contact) => {
      this.upsertDatabaseEntry('contacts', contact.id, contact);
    });
    this.events.subscribe("backup:deleteContact", (contact) => {
      this.deleteDatabaseEntry('contacts', contact.id);
    });

    try {
      const hiveAuthHelper = new TrinitySDK.Hive.AuthHelper();

      const hiveClient = await hiveAuthHelper.getClientWithAuth((authError)=>{
        console.warn("Hive authentication error callback: ", authError);
      });
      console.log("Hive client initialization complete");

      const userDID = await this.didService.getSignedIdentity();

      // did:elastos:iaMPKSkYLJYmbBTuT3JfF9E8cFtLWky5vk - Test

      console.log("Getting current user's vault instance");
      this.userVault = await hiveClient.getVault(userDID); // No response here

      if (!this.userVault) {
        console.log("Failed to get user's vault. Maybe none if configured yet. Backup service not starting for now");
        return;
      }

      console.log("User vault retrieved. Now creating a new backup restore helper instance", this.userVault);

      this.backupRestoreHelper = new TrinitySDK.Backup.BackupRestoreHelper(this.userVault, true);

      this.restoredContacts = [];
      this.backupRestoreHelper.addSyncContext("contacts",
        async (entry) => {
          // Add backup locally
          console.log("Addition request from backup helper", entry);
          await this.addContactEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Modify backup locally
          console.log("Modify request from the backup helper", entry);
          this.modifyContactEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Delete backup locally
          console.log("Deletion request from the backup helper", entry);
          this.deleteContactEntryLocally(entry.data.id);
          return true;
        }
      );

      console.log("Starting backup restore sync");
      await this.backupRestoreHelper.sync();
    } catch (e) {
      // We could get a hive exception here
      console.error("Catched exception during backup service initialization:");
      console.error(e);
    }
  }

  async addContactEntryLocally(data: Contact) {
    console.log('Checking if backup data needs to be added', data);
    this.restoredContacts.push(data);

    const contactId = data.id;
    const targetContact = this.friendsService.contacts.find((contact) => contact.id === contactId);
    if (!targetContact) {
      console.log('Backup data needs to be added', data);

      /* TODO @chad - Replace with another UI indicator?
      titleBarManager.showActivityIndicator(
        TitleBarPlugin.TitleBarActivityType.DOWNLOAD,
        this.translate.instant('restoring-backup')
      );*/

      // await this.friendsService.resolveDIDDocument(contactId, false, null, false);

      await this.addContact(data);
    }
  }

  addContact(data: Contact): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.friendsService.contacts.push(data);
        this.friendsService.saveContactsState();

        // Update home page contacts slide
        this.events.publish('friends:updateSlider');
        // TODO @chad titleBarManager.hideActivityIndicator(TitleBarPlugin.TitleBarActivityType.DOWNLOAD);
        resolve();
      }, 1000);
    })
  }

  modifyContactEntryLocally(data: Contact) {
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

    this.friendsService.saveContactsState();
  }

  deleteContactEntryLocally(contactId: string) {
    this.restoredContacts = this.restoredContacts.filter((contact) => contact.id !== contactId);
    this.friendsService.contacts = this.friendsService.contacts.filter((contact) => contact.id !== contactId);
    this.friendsService.saveContactsState();

    // Update home page contacts slide
    this.events.publish('friends:updateSlider');
  }

  async upsertDatabaseEntry(context: string, key: string, data: HivePlugin.JSONObject): Promise<void> {
    try {
      console.log('Local restored contacts', this.restoredContacts);
      console.log('upsertDatabaseEntry called for entry', context, key);
      await this.backupRestoreHelper.upsertDatabaseEntry(context, key, data);
    } catch (e) {
      console.error('BackupService upsertDatabaseEntry error:', e);
    }
  }

  async deleteDatabaseEntry(contextName: string, key: string): Promise<void> {
    try {
      console.log('Backup restored contacts', this.restoredContacts);
      console.log('deleteDatabaseEntry called for entry', contextName, key);
      await this.backupRestoreHelper.deleteDatabaseEntry(contextName, key);
    } catch (e) {
      console.error('BackupService deleteDatabaseEntry error:', e);
    }
  }

}
