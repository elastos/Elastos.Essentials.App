import { DID } from './did.model';
import { DIDHelper } from '../helpers/did.helper';
import { NewIdentity } from './newidentity';
import { DIDURL } from './didurl.model';
import { Util } from '../services/util';
import { Logger } from 'src/app/logger';

declare let didManager: DIDPlugin.DIDManager;

export class DIDStore {
    public pluginDidStore: DIDPlugin.DIDStore = null;
    public dids = new Array<DID>();

    constructor() {}

    public getId(): string {
        return this.pluginDidStore.getId();
    }

    public static async create(didStoreId = null) : Promise<DIDStore> {
        // Build fails using this type.. Trying to use get didstring using property did.plugin.didString which exists but it says it does not have this property
        let didStore = new DIDStore();
        //let didStore = null;

        // No ID provided (which is normally the case except for the resolver DID store) -> create one.
        if (!didStoreId)
            didStoreId = Util.uuid(6, 16);

        Logger.log('didsessions', "Initializing a new DID Store with ID "+didStoreId);
        try {
          await didStore.initDidStore(didStoreId);
        }
        catch(e) {
          Logger.log('didsessions', 'DIDStore create: e:', e)
          throw e;
        }

        return didStore;
    }

    private async initDidStore(didStoreId: string) {
        try {
            this.pluginDidStore = await this.initPluginDidStore(didStoreId);
        }
        catch (e) {
            Logger.error('didsessions', "initDidStore:", e);
            throw e;
        }
    }

    public async addDID(newIdentity: NewIdentity, storePassword: string): Promise<DID> {
        let createdDid: DIDPlugin.DID;

        try {
            // Create and add a DID to the DID store in physical storage.
            createdDid = await this.createPluginDid(storePassword, "");
            Logger.log('didsessions', "Created DID:", createdDid);
        }
        catch (e) {
            Logger.error('didsessions', "Create DID exception", e);
            throw DIDHelper.reworkedPluginException(e);
        }

        // Add DID to our memory model.
        let did = new DID(createdDid);
        this.dids.push(did);

        await did.addNameCredential(newIdentity.name, storePassword);

        return did;
    }

    private initPluginDidStore(didStoreId: string): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve, reject)=>{
            didManager.initDidStore(
                didStoreId,
                (payload: string, memo: string) =>{
                    // Never called
                    Logger.warn("didsessions", "Create ID transaction callback called but we do not handle it!");
                },
                (pluginDidStore: DIDPlugin.DIDStore) => {
                    Logger.log("DIDSessions", "Initialized DID Store is ", pluginDidStore);
                    resolve(pluginDidStore);
                },
                (err) => {
                    Logger.log('didsessions', 'initPluginDidStore error:', err);
                    reject(DIDHelper.reworkedPluginException(err))
                },
            );
        });
    }

    /**
     * Right after its creation, a DID store needs to define a private root key (private identity)
     */
    public async createPrivateIdentity(mnemonicPass: string, storePass: string, mnemonicLang: DIDPlugin.MnemonicLanguage, mnemonic: string) : Promise<boolean> {
        // Create a private root key
        Logger.log('didsessions', "Creating private root key");
        await this.initPluginPrivateIdentity(mnemonicLang, mnemonic, mnemonicPass, storePass, true);

        return true;
    }

    private initPluginPrivateIdentity(language, mnemonic, mnemonicPass, storePass, force): Promise<void> {
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.initPrivateIdentity(
                language, mnemonic, mnemonicPass, storePass, force,
                () => {resolve()}, (err) => {reject(err)},
            );
        });
    }

    createPluginDid(passphrase, hint = ""): Promise<DIDPlugin.DID> {
        Logger.log('didsessions', "Creating DID");
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.newDid(
                passphrase, hint,
                (did) => {
                    Logger.log('didsessions', "Created plugin DID:", did);
                    resolve(did)
                },
                (err) => {reject(err)},
            );
        });
    }

    storeDid(didDocumentId, hint): Promise<void> {
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.storeDidDocument(
                didDocumentId, hint,
                () => {resolve()}, (err) => {reject(err)},
            );
        });
    }

    public async loadAll() {
        Logger.log("DIDSessions", "DID store loading all.");
        try {
            await this.initDidStore(this.getId());

            let pluginDids = await this.listPluginDids();

            Logger.log("DIDSessions", "Plugin DIDs:", pluginDids);
            if (pluginDids.length == 0) {
                // Something went wrong earlier, no DID in the DID store...
                Logger.log('didsessions', "No DID in the DID Store.")
            }

            await this.loadAllDids(pluginDids);
        }
        catch (e) {
            Logger.error('didsessions', "Fatal error while loading from DID Store id.", e);
            return;
        }
    }

    protected async loadAllDids(pluginDids: DIDPlugin.DID[]) {
        this.dids = [];
        for(let pluginDid of pluginDids) {
            Logger.log("DIDSessions", "Loading DID "+pluginDid.getDIDString());
            let did = new DID(pluginDid);
            await did.loadAll();
            this.dids.push(did);
        }
        Logger.log("DIDSessions", "Loaded DIDs:", this.dids);
    }

    listPluginDids(): Promise<DIDPlugin.DID[]> {
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.listDids(
                "DID_ALL",
                (ret) => {resolve(ret)}, (err) => {reject(err)},
            );
        });
    }

    public loadDIDDocument(didString: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.loadDidDocument(
                didString,
                (ret) => {resolve(ret)}, (err) => {reject(err)},
            );
        });
    }

    synchronize(storepass): Promise<void> {
        return new Promise((resolve, reject)=>{
            this.pluginDidStore.synchronize(
                storepass,
                () => {
                    // After a sync, reload all dids
                    void this.loadAll().then(()=>resolve());
                }, (err) => {
                    reject(DIDHelper.reworkedPluginException(err))
                },
            );
        });
    }
}
