import PQueue from 'p-queue/dist';
import { Logger } from "src/app/logger";
import { GlobalStorageService } from "src/app/services/global.storage.service";

declare let hiveManager: HivePlugin.HiveManager;

export class SyncContext {
    name: string;
    /**
     * An entry exists on the vault but does not exist locally.
     *
     * Must return: true if the synchronization to local was done successfully, false otherwise.
     */
    onRemoteInsertion: (entry: BackupRestoreEntry) => Promise<boolean>;
    /**
     * An entry that exists both on the vault and locally has been changed more recently compared
     * to the local copy.
     *
     * Must return: true if the synchronization to local was done successfully, false otherwise.
     */
    onRemoteModification: (entry: BackupRestoreEntry) => Promise<boolean>;
    /**
     * An entry was deleted on the vault and is not marked as deleted locally yet.
     *
     * Must return: true if the synchronization to local was done successfully, false otherwise.
     */
    onRemoteDeletion: (entry: BackupRestoreEntry) => Promise<boolean>;
}

export class BackupRestoreEntry {
    key: string; // Unique key used to overwrite/update the same content
    creationDate: number; // Timestamp MS
    modificationDate: number; // Timestamp MS - "Modification" means any change: data, deletion, etc.
    deletionDate: number; // Timestamp MS
    data: any; // Custom application data
}

export class LocalBackupRestoreEntry extends BackupRestoreEntry {
    syncDate: number; // Timestamp MS

    static fromJson(json: any): LocalBackupRestoreEntry {
        if (!json)
            return null;

        let entry = new LocalBackupRestoreEntry();
        entry.key = json.key;
        entry.creationDate = json.creationDate;
        entry.modificationDate = json.modificationDate;
        entry.deletionDate = json.deletionDate;
        entry.data = json.data;
        return entry;
    }
}

/**
 * Helper class to easily backup, restore and synchronize application data, including
 * over multiple devices signed in with the same DID.
 *
 * Sync contexts: they represent a "scope" for items of the same kind. For example, your application
 * may want to backup both a list of contact, and a "todo" list. In this case you would use two
 * sync contexts: one named "contacts", and the other one "todolist". Each sync context mau contain
 * only items that have the same data structure.
 *
 * Concept:
 * - Every time your application adds, edits or deletes an item in the local application data model,
 * this backup restore service should also be notified by calling methods such as upsertDatabaseEntry().
 * - sync() may be called when you think it's a good time to synchronize the local application with the vault
 * backup, or with other devices using the same DID. This operation could be time and network intensive.
 * - Implement the sync context callback (insertion, modification and deletion) in order to synchronize updates
 * coming from the vault backup.
 */
export class HiveDataSync {
    private contexts: SyncContext[] = [];
    private opsQueue: PQueue = null; // Queue of operations such as add, remove or sync to ensure sequencial order and too many syncs
    private requestToCancelOnGoingSync = false; // True when we are willing to cancel an on going sync, to make the sync process stop.
    private syncInQueue = false; // Whether a sync request is already in the operations queue or not, so we don't queue more than one at a time.

    /**
     * As this backup helper relies on hive vaults, a vault instance of the currently user must be
     * passed.
     *
     * Debug information can be displayed in console logs by setting showDebugLogs to true.
     */
    constructor(private userVault: HivePlugin.Vault, private storage: GlobalStorageService, private showDebugLogs: boolean = false) {
        if (!userVault) {
            throw new Error("The backup restore helper can't be used without a user vault. Please make sure the vault was correctly initialized.");
        }

        this.userVault = userVault;
        this.showDebugLogs = showDebugLogs;
        this.opsQueue = new PQueue({
            concurrency: 1
        });
    }

    /**
     * Creates a new sync context, a scope for a specific type of data your application wants to
     * backup and restore.
     *
     * The 3 callbacks, insertion, modification and deletion must be implemented to synchronize the
     * vault with your local application data.
     *
     * onRemoteInsertion: a new item exists on the vault backup, but not locally. Your application may
     * add the incoming item locally on the device then return true to notify this service that the synchronization
     * for this item was successful and should not be attempted again later.
     *
     * onRemoteModification: an item that already exists both on the vault backup and in the local
     * device backup has been modified on the vault side. Its data must be synchronized locally.
     *
     * onRemoteDeletion an item that already exists both on the vault backup and in the local
     * device backup has been deleted on the vault side. Your application may delete it as well on the
     * device.
     */
    public addSyncContext(
        context: string,
        onRemoteInsertion: (entry: BackupRestoreEntry) => Promise<boolean>,
        onRemoteModification: (entry: BackupRestoreEntry) => Promise<boolean>,
        onRemoteDeletion: (entry: BackupRestoreEntry) => Promise<boolean>) {

        let syncContext = new SyncContext();
        syncContext.name = context;
        syncContext.onRemoteInsertion = onRemoteInsertion;
        syncContext.onRemoteModification = onRemoteModification;
        syncContext.onRemoteDeletion = onRemoteDeletion;

        this.contexts.push(syncContext);

        // Listen to backup events from hive (pub/sub)
        // TODO this.userVault.getPubSub().subscribe("db-changed-"+context)
    }

    /**
     * Stops all on going operations.
     */
    public stop() {
        // Cancel on going sync, if any.
        this.cancelOnGoingSync();
    }

    /**
     * Requests to stop the on going sync, if any, so we can probably add/remove more items and start a new sync
     * with the latest data.
     */
    private cancelOnGoingSync() {
        this.requestToCancelOnGoingSync = true;
        // Consider we have no more sync in queue so we can start queing new ones after a cancellation, even if
        // the sync loop is not yet fully stopped (haven't checked the requestToCancelOnGoingSync boolean)
        this.syncInQueue = false;
    }

    /**
     * Inserts or updates an item to the backup items. This item data is first persisted locally on the device,
     * and a sync() operation is requested to send it to the vault backup as well.
     * In case the sync() fails, the sync() operation is retried later on.
     */
    public async upsertDatabaseEntry(context: string, key: string, data: HivePlugin.JSONObject) {
        this.cancelOnGoingSync();

        await this.opsQueue.add(async () => {
            // Upsert locally
            await this.upsertDatabaseEntryLocally(context, key, data);
        });

        // Sync with hive - don't block until completion, sync could happen any time.
        void this.sync();
    }

    private async upsertDatabaseEntryLocally(contextName: string, key: string, data: HivePlugin.JSONObject) {
        let now = new Date().getTime();

        // First, look for the entry locally. Create new entry only if nothing found.
        let existingLocalEntry = await this.loadLocalDatabaseEntry(contextName, key);
        let localEntry: LocalBackupRestoreEntry = null;
        if (existingLocalEntry) {
            // Entry exists. Update it
            localEntry = existingLocalEntry;
            localEntry.data = data;
            localEntry.modificationDate = now;
            localEntry.deletionDate = null; // If re-creating an entry over a deleted one, need to clear the deletion field

            this.logDebug("upsertDatabaseEntryLocally() - updating existing entry", localEntry);
        }
        else {
            // Entry does not exist. Create it
            localEntry = {
                key: key,
                creationDate: now,
                modificationDate: now,
                deletionDate: null,
                syncDate: null,
                data: data
            }

            this.logDebug("upsertDatabaseEntryLocally() - creating new entry", localEntry);
        }

        await this.saveLocalDatabaseEntry(contextName, localEntry);
    }

    /**
     * Deletes an item from the backup items. Items are deleted only after a successufll synchronization
     * to the vault.
     *
     * If deleteLocallyOnly is set to true (default false), the entry is deleted locally and not synced
     * with the vault, as if it never existed in this device.
     */
    public async deleteDatabaseEntry(contextName: string, key: string, deleteLocallyOnly = false) {
        if (!deleteLocallyOnly) {
            this.cancelOnGoingSync();

            await this.opsQueue.add(async () => {
                // Delete locally
                await this.deleteDatabaseEntryLocallyMarkOnly(contextName, key);
            });

            // Sync with hive
            void this.sync();
        }
        else {
            // Directly delete locally without a sync.
            await this.deleteDatabaseEntryLocallyForReal(contextName, key);
        }
    }

    /**
     * Returns a matching local backup entry, if any, or null otherwise.
     */
    public getDatabaseEntry(contextName: string, key: string): Promise<LocalBackupRestoreEntry> {
        return this.loadLocalDatabaseEntry(contextName, key);
    }

    private async loadLocalDatabaseEntry(contextName: string, key: string): Promise<LocalBackupRestoreEntry> {
        let rawEntry = await this.loadSettingsEntry(contextName + "_" + key);
        if (!rawEntry)
            return null;

        return LocalBackupRestoreEntry.fromJson(rawEntry);
    }

    private async saveLocalDatabaseEntry(contextName: string, entry: LocalBackupRestoreEntry) {
        // Add (if not existing) this entry key to our index of entries to be able to retrieve it later
        await this.addKeyToSavedEntriesList(contextName, entry.key);
        // Save the entry to local disk storage
        await this.saveSettingsEntry(contextName + "_" + entry.key, entry);
    }

    private async deleteDatabaseEntryLocallyMarkOnly(contextName: string, entryKey: string) {
        let localEntry = await this.loadLocalDatabaseEntry(contextName, entryKey);
        if (localEntry) {
            // Entry exists. Update it
            let now = new Date().getTime();
            localEntry.deletionDate = now;
            localEntry.modificationDate = now;

            await this.saveLocalDatabaseEntry(contextName, localEntry);

            this.logDebug("deleteDatabaseEntryLocallyMarkOnly() - marking entry as deleted", localEntry);
        }
        else {
            this.logWarn("Tried to mark entry as deleted but entry can't be found in local model!", entryKey);
        }
    }

    private async deleteDatabaseEntryLocallyForReal(contextName: string, entryKey: string) {
        this.logDebug("Really deleting local database entry", contextName, entryKey);

        await this.saveSettingsEntry(contextName + "_" + entryKey, null);
        await this.removeKeyFromSavedEntriesList(contextName, entryKey);
    }

    // Create or update the local entry on the vault
    private async upsertDatabaseEntryOnVault(contextName: string, localEntry: BackupRestoreEntry) {
        let upsertedEntry = {
            key: localEntry.key,
            creationDate: localEntry.creationDate,
            modificationDate: localEntry.modificationDate,
            deletionDate: localEntry.deletionDate,
            data: localEntry.data
        };

        // Check if the entry exists on the vault. TODO: we need an "upsert" method in the hive plugin...
        let vaultEntry = await this.getVaultDatabaseEntry(contextName, localEntry.key);
        if (vaultEntry) {
            // The entry exists. Update it
            this.logDebug("Updating vault entry: ", contextName, localEntry.key, upsertedEntry);
            // Note: use of updateMany instead of updateOne here (normally, we have only one entry with
            // a given key...) because there were bugs were duplicates entries were created, so we want to update
            // them all, not only the first one found.
            await this.userVault.getDatabase().updateMany(this.getCollectionNameForContext(contextName), {
                key: localEntry.key
            }, {
                $set: upsertedEntry
            });
        }
        else {
            // The entry does not exist. Insert it
            this.logDebug("Inserting new vault entry: ", contextName, localEntry.key, upsertedEntry);
            await this.userVault.getDatabase().insertOne(this.getCollectionNameForContext(contextName), upsertedEntry);
        }
    }

    private async getVaultDatabaseEntry(contextName: string, key: string): Promise<BackupRestoreEntry> {
        let collectionName = this.getCollectionNameForContext(contextName);
        this.logDebug("Fetching vault entry with key", key, "in collection", collectionName);
        let vaultEntry = (await this.userVault.getDatabase().findOne(collectionName, {
            key: key
        }) as any) as BackupRestoreEntry;

        this.logDebug("Fetched vault entry:", vaultEntry);

        return vaultEntry;
    }

    private async createContextCollection(contextName: string): Promise<void> {
        let collectionName = this.getCollectionNameForContext(contextName);
        this.logDebug("Making sure the collection "+collectionName+" exists");
        await this.userVault.getDatabase().createCollection(collectionName);
    }

    /**
     * Synchronizes all backup items of all contexts to the vault. This operation does:
     *
     * - Checks items modified on the vault backup, for which we don't have the modifications locally yet.
     * For each of them, insertion/modification/deletion callbacks are called in order to synchronize the application
     * model.
     * - Every item modified locally is also pushed back to the vault backup.
     *
     * After a successfull sync() on a device, another device can also sync() from its side and will
     * get all the recent changes.
     *
     * If remotelyModifiedEntriesOnly is true (default), the sync is done only with remote entries
     * that have been modified since the last time we did a full sync on this device. This boolean
     * can be forced to false to force a full comparison with the whole set of entries.
     */
    public sync(remotelyModifiedEntriesOnly = true): Promise<boolean> {
        this.logDebug("Handling sync request");

        if (this.syncInQueue) {
            this.logDebug("Synchronization request not handle because another sync is already in the queue");
            return Promise.resolve(false);
        }

        this.syncInQueue = true; // Remember that a sync operation was already added to the operations queue to always queue only one
        this.requestToCancelOnGoingSync = false; // Reset previous request.

        // Queue the sync operations like other upsert or remove operations, to ensure to not edit data during a sync.
        return this.opsQueue.add(async () => {
            this.log("Synchronization starting");

            this.syncInQueue = false;

            for (let context of this.contexts) {
                this.log("Synchronizing context:", context);

                // Make sure the collection exists
                await this.createContextCollection(context.name);

                let vaultModifiedEntries: BackupRestoreEntry[];
                if (remotelyModifiedEntriesOnly) {
                    // Generate the list of vault entries modified since the last FULL local successful sync
                    vaultModifiedEntries = await this.getVaultModifiedEntriesSinceLastFullLocalSync(context.name);
                }
                else {
                    // Called forces us to do a FULL sync from day 1
                    vaultModifiedEntries = await this.getAllVaultEntries(context.name);
                }

                for (let vaultModifiedEntry of vaultModifiedEntries) {
                    let matchingLocalEntry = await this.loadLocalDatabaseEntry(context.name, vaultModifiedEntry.key);
                    if (matchingLocalEntry) {
                        // We have this entry locally. Check if it was modified remotely more recently.
                        if (matchingLocalEntry.modificationDate < vaultModifiedEntry.modificationDate) {
                            // Need to update the local copy
                            if (vaultModifiedEntry.deletionDate) {
                                // The entry has been removed on the vault side. We also need to remove it locally
                                this.logDebug("Entry found on the vault and locally, and deleted on the vault. Calling onRemoteDeletion()");
                                if (await context.onRemoteDeletion(vaultModifiedEntry)) {
                                    // Operation on the app side was completed successfully, so we can mark
                                    // this entry as deleted as well on this side.
                                    let now = new Date().getTime();
                                    matchingLocalEntry.modificationDate = vaultModifiedEntry.modificationDate;
                                    matchingLocalEntry.deletionDate = vaultModifiedEntry.deletionDate;
                                    matchingLocalEntry.data = vaultModifiedEntry.data;
                                    matchingLocalEntry.syncDate = now;
                                    await this.saveLocalDatabaseEntry(context.name, matchingLocalEntry);
                                }
                                else {
                                    this.logDebug("onRemoteDeletion() has failed on the app side. Stopping synchronization. Will retry later", context.name, vaultModifiedEntry.key);
                                    return false;
                                }
                            }
                            else {
                                // The entry has been modified on the vault side. We also need to modify it locally
                                this.logDebug("Entry found on the vault and locally, and modified more recently on the vault. Calling onRemoteModification()");
                                if (await context.onRemoteModification(vaultModifiedEntry)) {
                                    // Operation on the app side was completed successfully, so we can mark
                                    // this entry as modified as well on this side.
                                    let now = new Date().getTime();
                                    matchingLocalEntry.modificationDate = vaultModifiedEntry.modificationDate;
                                    matchingLocalEntry.data = vaultModifiedEntry.data;
                                    matchingLocalEntry.syncDate = now;
                                    await this.saveLocalDatabaseEntry(context.name, matchingLocalEntry);
                                }
                                else {
                                    this.logDebug("onRemoteModification() has failed on the app side. Stopping synchronization. Will retry later", context.name, vaultModifiedEntry.key);
                                    return false;
                                }
                            }
                        }
                    }
                    else {
                        // No local entry: we need to insert it, if this is not a deleted entry on the vault yet
                        // The vault entry could not exist locally yet, BUT be deleted on the vault already. In this
                        // case, we don't handle it locally.
                        if (!vaultModifiedEntry.deletionDate) {
                            this.logDebug("Entry found on the vault but not existing locally. Calling onRemoteInsertion()");
                            if (await context.onRemoteInsertion(vaultModifiedEntry)) {
                                // Operation on the app side was completed successfully, so we can insert the entry
                                // as well on this side.
                                let newLocalEntry = {
                                    key: vaultModifiedEntry.key,
                                    creationDate: vaultModifiedEntry.creationDate,
                                    modificationDate: vaultModifiedEntry.modificationDate,
                                    deletionDate: null,
                                    syncDate: new Date().getTime(),
                                    data: vaultModifiedEntry.data
                                }

                                this.logDebug("After onRemoteInsertion() - creating new entry", newLocalEntry);

                                await this.saveLocalDatabaseEntry(context.name, newLocalEntry);
                            }
                            else {
                                this.logDebug("onRemoteInsertion() has failed on the app side. Stopping synchronization. Will retry later", context.name, vaultModifiedEntry.key);
                                return false;
                            }
                        }
                    }

                    if (this.requestToCancelOnGoingSync) {
                        this.logDebug("Request to cancel sync received, stopping current sync");
                        return false;
                    }
                }

                // Update created, modified and deleted local entries on the vault
                let entriesList = await this.getSavedEntriesList(context.name);
                for (let entryKey of entriesList) {
                    let localEntry = await this.loadLocalDatabaseEntry(context.name, entryKey);

                    this.logDebug("Checking if local entry needs to be synced with vault", localEntry);
                    if (!localEntry) {
                        // Should not happen but just in case...
                        this.logWarn("Local entry with key "+entryKey+" exists in saved entries list but the entry itself can't be found. This is an abnormal state. Local entry is skipped.");
                    }
                    else {
                        // Do something only if the local entry was modified since last sync to the vault
                        if (!localEntry.syncDate || localEntry.syncDate < localEntry.modificationDate) {
                            let vaultEntry = await this.getVaultDatabaseEntry(context.name, entryKey);
                            if (!vaultEntry || localEntry.modificationDate > vaultEntry.modificationDate) {
                                this.logDebug("Local entry has modifications, sending changes to the vault");

                                // Send to the vault
                                await this.upsertDatabaseEntryOnVault(context.name, localEntry);

                                if (!localEntry.deletionDate) {
                                    this.logDebug("Local entry is not deleted, saving sync date");
                                    // Save sync date
                                    localEntry.syncDate = new Date().getTime();
                                    await this.saveLocalDatabaseEntry(context.name, localEntry);
                                }
                                else {
                                    this.logDebug("Local entry is deleted and was synced to vault. Now deleting permanently");
                                    await this.deleteDatabaseEntryLocallyForReal(context.name, localEntry.key);
                                }
                            }
                            else {
                                this.logDebug("Up to date (local modification not more recent than vault modification)", localEntry);
                            }
                        }
                        else {
                            this.logDebug("Already synchronized (no local modification since last sync)", localEntry);
                        }
                    }

                    if (this.requestToCancelOnGoingSync) {
                        this.logDebug("Request to cancel sync received, stopping current sync");
                        return false;
                    }
                }

                // Save last sync time locally. In case of error
                await this.saveLastFullSuccessfulSyncDate();

                if (this.requestToCancelOnGoingSync) {
                    this.logDebug("Request to cancel sync received, stopping current sync");
                    return false;
                }
            }

            this.log("Synchronization complete");
            return true;
        });
    }

    /**
     * Deletes everything about the given context, locally. This is mostly a development only
     * method, provided for convenience while implementing sync contexts callbacks.
     *
     * All backup items are deleted locally, but without making any change to the vault side.
     * This operation is almost similar to reinstalling the application.
     */
    public async wipeLocalContextData(contextName: string) {
        this.logDebug("Wiping local context data for context", contextName);

        // Delete all entries
        let savedEntries = await this.getSavedEntriesList(contextName);
        for (let entryKey of savedEntries) {
            await this.deleteDatabaseEntryLocallyForReal(contextName, entryKey);
        }

        await this.clearLastFullSuccessfulSyncDate();
    }

    // List of entries that have been modified on the vault since we last synced locally on this device.
    private async getVaultModifiedEntriesSinceLastFullLocalSync(contextName: string): Promise<BackupRestoreEntry[]> {
        let lastFullSuccessfulLocalSync = await this.getLastFullSuccessfulSyncDate();
        this.logDebug("Fetching vault modified entries since last full local sync", lastFullSuccessfulLocalSync);

        let collectionName = this.getCollectionNameForContext(contextName);
        let filter = {};
        if (lastFullSuccessfulLocalSync) {
            filter["modificationDate"] = {
                $gt: lastFullSuccessfulLocalSync
            };
        }

        try {
            let entries = (await this.userVault.getDatabase().findMany(collectionName, filter) as any) as BackupRestoreEntry[];

            this.logDebug("Received vault modified entries since last full local sync:", entries);

            return entries;
        }
        catch (err) {
            if (hiveManager.errorOfType(err, "COLLECTION_NOT_FOUND")) {
                this.logDebug("Backup collection does not exist on the vault yet, thus no modified entries returned");
                return [];
            }
            else {
                throw err;
            }
        }
    }

    private async getAllVaultEntries(contextName: string): Promise<BackupRestoreEntry[]> {
        this.logDebug("Fetching all vault entries for context", contextName);

        let collectionName = this.getCollectionNameForContext(contextName);

        try {
            let entries = (await this.userVault.getDatabase().findMany(collectionName, {}) as any) as BackupRestoreEntry[];

            this.logDebug("Received vault entries:", entries);

            return entries;
        }
        catch (err) {
            let enhancedError = err as HivePlugin.EnhancedError;
            if (enhancedError.getType && enhancedError.getType() == "COLLECTION_NOT_FOUND") {
                this.logDebug("Backup collection does not exist on the vault yet, thus no entries returned");
                return [];
            }
            else {
                throw err;
            }
        }
    }

    /**
     * Returns the date (Timestamp in MS) at which a full sync was successful. A successful
     * sync means that all app callbacks (insertion, modification, deletion) have returned true,
     * meaning that the ap side could correctly handle all the changes.
     */
    private async getLastFullSuccessfulSyncDate(): Promise<number> {
        return await this.loadSettingsEntry("lastfullsyncdate");
    }

    private saveLastFullSuccessfulSyncDate() {
        return this.saveSettingsEntry("lastfullsyncdate", new Date().getTime());
    }

    private clearLastFullSuccessfulSyncDate() {
        this.logDebug("Clearing last full sync date");
        return this.saveSettingsEntry("lastfullsyncdate", null);
    }

    private getCollectionNameForContext(contextName: string): string {
        return "backup_" + contextName;
    }

    // List of entries keys stored in local storage, to be able to retrieve them later
    private async addKeyToSavedEntriesList(context: string, key: string) {
        let indexKey = context + "_index";

        // Reload the whole index - NOTE: we could use a cache for perf
        let savedEntries = await this.getSavedEntriesList(context);
        if (savedEntries.indexOf(key) < 0) {
            savedEntries.push(key);
        }

        // Save the whole set back to storage
        await this.saveSettingsEntry(indexKey, savedEntries);
    }

    private async removeKeyFromSavedEntriesList(context: string, key: string) {
        let indexKey = context + "_index";

        // Reload the whole index - NOTE: we could use a cache for perf
        let savedEntries = await this.getSavedEntriesList(context);
        let deletionIndex = savedEntries.indexOf(key);
        if (deletionIndex >= 0) {
            savedEntries.splice(deletionIndex, 1);
        }

        // Save the whole set back to storage
        await this.saveSettingsEntry(indexKey, savedEntries);
    }

    private async getSavedEntriesList(context: string): Promise<string[]> {
        let indexKey = context + "_index";
        return await this.loadSettingsEntry(indexKey) || [];
    }

    // Convenient promise-based way to save a setting in the app manager
    private saveSettingsEntry(key: string, value: any): Promise<void> {
        return this.storage.setSetting(this.userVault.getVaultOwnerDid(), "hivedatasync", key, value);
    }

    // Convenient promise-based way to get a setting from the app manager
    private loadSettingsEntry(key: string): Promise<any> {
        return this.storage.getSetting(this.userVault.getVaultOwnerDid(), "hivedatasync", key, null);
    }

    private log(message: any, ...params: any) {
        Logger.log("hivedatasync", message, params);
    }

    private logWarn(message: any, ...params: any) {
        Logger.warn("hivedatasync", message, ...params);
    }

    private logDebug(message: any, ...params: any) {
        if (this.showDebugLogs)
            Logger.log("hivedatasync", message, ...params);
    }
}