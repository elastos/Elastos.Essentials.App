import { DID } from './did.model';
import { Config } from '../services/config';
import { DIDDocument } from './diddocument.model';
import { DIDHelper } from '../helpers/did.helper';
import { LocalStorage } from '../services/localstorage';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Events } from 'src/app/services/events.service';

declare let didManager: DIDPlugin.DIDManager;

export class DIDStore {
    public pluginDidStore: DIDPlugin.DIDStore = null;
    public dids: DID[] = [];
    private activeDid: DID = null;

    constructor(
        private events: Events,
        private didSessions: GlobalDIDSessionsService,
        private globalIntentService: GlobalIntentService
    ) { }

    public getActiveDid(): DID {
        return this.activeDid
    }

    public async setActiveDid(did: DID) {
        Logger.log("Identity", "DID store " + this.getId() + " is setting its active DID to " + (did ? did.getDIDString() : null));
        this.activeDid = did;

        // When we set a new active DID, we also load its DIDDocument to cache it for later use.
        if (this.activeDid) {
            let didDocument = await this.loadDidDocument(this.activeDid.getDIDString());
            this.activeDid.setLoadedDIDDocument(didDocument);
        }
    }

    public getId(): string {
        return this.pluginDidStore.getId();
    }

    /**
     * Right after its creation, a DID store needs to define a private root key (private identity)
     */
    public async createPrivateIdentity(mnemonicPass: string, storePass: string, mnemonicLang: DIDPlugin.MnemonicLanguage, mnemonic: string): Promise<boolean> {
        let hasPrivId = await this.hasPrivateIdentity();
        if (hasPrivId) {
            Logger.error('identity', "Private identity already exists!")
            return false; // Unable to load store data correctly
        }

        // Create a private root key
        Logger.log('identity', "Creating private root key");
        await this.initPluginPrivateIdentity(mnemonicLang, mnemonic, mnemonicPass, storePass, true);

        return true;
    }

    public async initNewDidStore(didStoreId = null) {
        // No ID provided (which is normally the case except for the resolver DID store) -> create one.
        if (!didStoreId)
            didStoreId = Config.uuid(6, 16);

        Logger.log('identity', "Initializing a new DID Store with ID " + didStoreId);
        try {
            await this.initDidStore(didStoreId);
        }
        catch (e) {
            Logger.log('identity', 'initNewDidStore: e:', e)
            throw e;
        }
    }

    private async initDidStore(didStoreId: string) {
        try {
            this.pluginDidStore = await this.initPluginDidStore(didStoreId);
        }
        catch (e) {
            Logger.error('identity', "initDidStore:", e);
            throw e;
        }
    }

    public async loadAll(didStoreId: string, restoreDeletedDIDs: boolean) {
        Logger.log("Identity", "DID store loading all.");
        try {
            await this.initDidStore(didStoreId);

            let pluginDids = await this.listPluginDids();

            Logger.log('identity', "Plugin DIDs:", pluginDids);
            if (pluginDids.length == 0) {
                // Something went wrong earlier, no DID in the DID store...
                Logger.warn('identity', "No DID in the DID Store, that's a bit strange but we want to continue here.")
            }

            await this.loadAllDids(pluginDids, restoreDeletedDIDs);
        }
        catch (e) {
            Logger.error('identity', "Fatal error while loading from DID Store id.", e);
            return null;
        }
    }

    /**
     * Fills this object model by loading a plugin DID store with all its contained DIDs, credentials, etc.
     */
    public static async loadFromDidStoreId(didStoreId: string, events: Events, didSessions: GlobalDIDSessionsService, intentService: GlobalIntentService): Promise<DIDStore> {
        Logger.log("Identity", "Loading all data from DID Store " + didStoreId);

        let didStore = new DIDStore(events, didSessions, intentService);
        await didStore.loadAll(didStoreId, false);

        return didStore;
    }

    protected async loadAllDids(pluginDids: DIDPlugin.DID[], restoreDeletedDIDs: boolean) {
        this.dids = [];
        for (let pluginDid of pluginDids) {
            // Check if this DID was previously deleted. If so, don't load it as a usable DID.
            // The reason why a deleted DID could be listed again by the DID plugin is if we call
            // synchronize() (ex: before creating a new DID), then a published DID would be restored
            // locally by the SDK. As SDKs and ID chain are currently not able to deactivate DIDs, we then just
            // "hide" this in app, not showing deleted DID even if they are re-synchronized from chain.
            let didWasDeleted = await this.wasDIDDeleted(pluginDid.getDIDString())
            if (didWasDeleted && restoreDeletedDIDs) {
                await this.removeDIDFromDeleted(pluginDid.getDIDString());
                didWasDeleted = false;
            }

            if (!didWasDeleted) {
                Logger.log("Identity", "Loading DID " + pluginDid.getDIDString());

                let did = new DID(pluginDid, this.events, this.didSessions);
                try {
                    await did.loadAll();
                    this.dids.push(did);
                }
                catch (e) {
                    // Failed to load the DID? Don't push it.
                    Logger.warn("identity", "Failed to load all for DID ", did, e);
                }
            }
            else {
                Logger.log('identity', "DID " + pluginDid.getDIDString() + " was listed by the DID plugin but deleted locally earlier. Skipping it.");
            }
        }
        Logger.log("Identity", "Loaded DIDs:", this.dids);
    }

    /**
     * Finds a loaded DID in the DID list, from its DID string.
     */
    public findDidByString(didString: string): DID {
        Logger.log("Identity", "Searching DID from did string " + didString);

        if (!didString)
            return null;

        return this.dids.find((did) => {
            return did.getDIDString() == didString;
        })
    }

    private async wasDIDDeleted(didString: DIDPlugin.DIDString): Promise<boolean> {
        let deleted = await LocalStorage.instance.get("deleted-did-" + didString) || false;
        return deleted;
    }

    private async markDIDAsDeleted(didString: DIDPlugin.DIDString) {
        Logger.log('identity', "Marking DID " + didString + " as deleted in storage");
        await LocalStorage.instance.set("deleted-did-" + didString, true);
    }

    private async removeDIDFromDeleted(didString: DIDPlugin.DIDString) {
        Logger.log('identity', "Remove DID " + didString + " from deleted in storage");
        await LocalStorage.instance.remove("deleted-did-" + didString);
    }

    private initPluginDidStore(didStoreId: string): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve, reject) => {
            didManager.initDidStore(
                didStoreId,
                (payload: string, memo: string) => {
                    //console.log("DEBUG initPluginDidStore", payload, memo);
                    void this.createIdTransactionCallback(payload, memo);
                },
                (pluginDidStore: DIDPlugin.DIDStore) => {
                    Logger.log("Identity", "Initialized DID Store is ", pluginDidStore);
                    resolve(pluginDidStore);
                },
                (err) => {
                    Logger.log('identity', 'initPluginDidStore error:', err);
                    reject(DIDHelper.reworkedPluginException(err))
                },
            );
        });
    }

    /**
     * This callback is called after calling publish() on a DIDDocument. It returns a DID request payload
     * that we have to forward to the wallet application so it can write the did request on the did
     * sidechain for us.
     */
    private createIdTransactionCallback(payload: string, memo: string) {
        this.events.publish("diddocument:onpublishpayload", {
            payload,
            memo
        });
    }

    public async loadDidDocument(didString: string): Promise<DIDDocument> {
        let pluginDidDocument = await this.loadPluginDidDocument(didString);
        return new DIDDocument(pluginDidDocument);
    }

    private loadPluginDidDocument(didString: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.loadDidDocument(
                didString,
                (didDocument) => {
                    resolve(didDocument)
                }, (err) => {
                    reject(err)
                },
            );
        });
    }

    private initPluginPrivateIdentity(language, mnemonic, mnemonicPass, storePass, force): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.initPrivateIdentity(
                language, mnemonic, mnemonicPass, storePass, force,
                () => { resolve() }, (err) => { reject(err) },
            );
        });
    }

    hasPrivateIdentity(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.containsPrivateIdentity(
                (hasPrivId) => { resolve(hasPrivId) }, (err) => { reject(err) },
            );
        });
    }

    deletePluginDid(didString): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.deleteDid(
                didString,
                () => { resolve() }, (err) => { reject(err) },
            );
        });
    }

    createPluginDid(passphrase, hint = ""): Promise<DIDPlugin.DID> {
        Logger.log('identity', "Creating DID");
        return new Promise((resolve, reject) => {
            this.pluginDidStore.newDid(
                passphrase, hint,
                (did) => {
                    Logger.log('identity', "Created plugin DID:", did);
                    resolve(did)
                },
                (err) => { reject(err) },
            );
        });
    }

    listPluginDids(): Promise<DIDPlugin.DID[]> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.listDids(
                "DID_ALL",
                (ret) => { resolve(ret) }, (err) => { reject(err) },
            );
        });
    }

    storeDid(didDocumentId, hint): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.pluginDidStore.storeDidDocument(
                didDocumentId, hint,
                () => { resolve() }, (err) => { reject(err) },
            );
        });
    }

    // updateDid(didDocument: DIDPlugin.DIDDocument, didUrlString, storepass): Promise<any> {
    //     return new Promise((resolve, reject)=>{
    //         this.pluginDidStore.updateDidDocument(
    //             didDocument, storepass,
    //             () => {resolve()}, (err) => {reject(err)},
    //         );
    //     });
    // }

    setResolverUrl(resolverUrl): Promise<void> {
        return new Promise((resolve, reject) => {
            didManager.setResolverUrl(
                resolverUrl,
                () => { resolve() }, (err) => { reject(err) },
            );
        });
    }

    synchronize(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.synchronize(
                null, // Not needed any more with DID 2.0
                () => { resolve('didStore synchronize success') }, (err) => {
                    reject(DIDHelper.reworkedPluginException(err))
                },
            );
        });
    }

    changePassword(oldPassword, newPassword): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.changePassword(
                oldPassword, newPassword,
                () => { resolve() }, (err) => { reject(err) },
            );
        });
    }

    exportMnemonic(password: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pluginDidStore.exportMnemonic(
                password,
                (res) => { resolve(res) }, (err) => { reject(err) },
            );
        });
    }
}
