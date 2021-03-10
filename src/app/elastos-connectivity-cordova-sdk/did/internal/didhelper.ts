import moment from "moment";
import { IKeyValueStorage } from "../../interfaces/ikeyvaluestorage";
import { ILogger } from "../../interfaces/ilogger";
import { DefaultLogger } from "../../internal/defaultlogger";
import { Utils } from "../utils";

declare let didManager: DIDPlugin.DIDManager;

export class DIDHelper {
    public logger: ILogger = new DefaultLogger();
    private storageLayer: IKeyValueStorage = null;

    constructor() {}

    /**
     * Overrides the default console logger with a custom logger.
     */
    public setLogger(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Overrides the default storage layer in order to store data in a custom storage.
     * By default, the default storage uses webview's local storage.
     */
    public setStorage(storageLayer: IKeyValueStorage) {
        this.storageLayer = storageLayer;
    }

    /**
     * Saves app instance did info to permanent storage.
     */
    public async saveAppInstanceDIDInfo(storeId: string, didString: string, storePassword: string): Promise<void> {
        await this.setAppManagerSetting("dappsdk_appinstancedidstoreid", storeId);
        await this.setAppManagerSetting("dappsdk_appinstancedidstring", didString);
        // TODO: Devices with biometric auth enabled may use the password manager to save this password
        // more securely than in local storage.
        await this.setAppManagerSetting("dappsdk_appinstancedidstorepassword", storePassword);
    }

    /**
     * Use the same mechanism as generateRandomDIDStoreId(), this can generate a simple password.
     */
    public generateRandomPassword(): string {
        return Utils.generateRandomDIDStoreId();
    }

    /**
     * Convenient way to retrieve settings from the app manager plugin.
     */
    public getAppManagerSetting(settingName: string, defaultValue: string): Promise<string> {
        return this.storageLayer.get(settingName, defaultValue);
    }

    /**
     * Convenient way to save settings to the app manager plugin.
     */
    public setAppManagerSetting(settingName: string, value: string): Promise<void> {
        return this.storageLayer.set(settingName, value);
    }

    /**
     * Convenient way to open a DID store from its ID
     */
    public static openDidStore(storeId: string): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve)=>{
            didManager.initDidStore(storeId, null, (didstore)=>{
            resolve(didstore);
            }, (err)=>{
            resolve(null);
            })
        });
    }

    /**
     * Convenient way to load a DID.
     */
    public static loadDID(didStore: DIDPlugin.DIDStore, didString: string): Promise<DIDPlugin.DID> {
        return new Promise((resolve, reject)=>{
            didStore.loadDidDocument(didString, (didDocument)=>{
                resolve(didDocument.getSubject());
            }, (err)=>{
                reject(err);
            })
        });
    }


    public static loadDIDCredentials(did: DIDPlugin.DID): Promise<DIDPlugin.VerifiableCredential[]> {
        return new Promise((resolve, reject)=>{
            did.loadCredentials((credentials)=>{
                resolve(credentials);
            }, (err)=> {
                reject(err);
            })
        });
    }
}