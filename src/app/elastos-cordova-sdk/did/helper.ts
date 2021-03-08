import { IAppIDGenerator } from "../iappidgenerator";
import { IKeyValueStorage } from "../ikeyvaluestorage";
import { ILogger } from "../ilogger";
import { DefaultLogger } from "../internal/defaultlogger";
const moment = require('moment');

declare let didManager: DIDPlugin.DIDManager;

export type FastDIDCreationResult = {
    didStore: DIDPlugin.DIDStore;
    did: DIDPlugin.DID;
    storePassword: string;
}

export class DIDHelper {
    private storageLayer: IKeyValueStorage = null;
    private logger = new DefaultLogger();

    constructor(private appIDGenerator: IAppIDGenerator | null) {
    }

    /**
     * Overrides the default storage layer in order to store data in a custom storage.
     * By default, the default storage uses webview's local storage.
     */
    public setStorage(storageLayer: IKeyValueStorage) {
        this.storageLayer = storageLayer;
    }

    /**
     * Overrides the default console logger with a custom logger.
     */
    public setLogger(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Generates a random ID, suitable for DID store ID format.
     */
    public generateRandomDIDStoreId(): string {
        let len = 6;
        let radix = 16;

        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data. At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return uuid.join('');
    }

    /**
     * Use the same mechanism as generateRandomDIDStoreId(), this can generate a simple password.
     */
    private generateRandomPassword(): string {
        return this.generateRandomDIDStoreId();
    }

    /**
     * Convenient method to:
     * - Create a new DID store
     * - Initiate its private key with a mnemonic
     * - Create a default DID in the store
     */
    public fastCreateDID(language: DIDPlugin.MnemonicLanguage): Promise<FastDIDCreationResult> {
        this.logger.log("Fast DID creation with language "+language);

        return new Promise((resolve)=>{
            didManager.generateMnemonic(language, (mnemonic)=>{
                let didStoreId = this.generateRandomDIDStoreId();
                didManager.initDidStore(didStoreId, (payload: string, memo: string) =>{
                    // Never called
                }, async (didStore)=>{
                    // Store created, now init the private identity
                    let storePass = this.generateRandomPassword();
                    didStore.initPrivateIdentity(language, mnemonic, null, storePass, true, ()=>{
                        // Now add a DID
                        didStore.newDid(storePass, "", (did)=>{
                            // DID added, now we can return
                            resolve({
                                didStore: didStore,
                                did: did,
                                storePassword: storePass
                            });
                        }, (err)=>{
                            this.logger.error(err);
                            resolve(null);
                        });
                    }, (err)=>{
                        this.logger.error(err);
                        resolve(null);
                    });
                }, (err)=>{
                    this.logger.error(err);
                    resolve(null);
                });
            });
        });
    }

    /**
     * Convenient way to open a DID store from its ID
     */
    public openDidStore(storeId: string): Promise<DIDPlugin.DIDStore> {
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
    public loadDID(didStore: DIDPlugin.DIDStore, didString: string): Promise<DIDPlugin.DID> {
        return new Promise((resolve)=>{
            didStore.loadDidDocument(didString, (didDocument)=>{
                resolve(didDocument.getSubject());
            }, (err)=>{
                this.logger.error(err);
                resolve(null);
            })
        });
    }

    /**
     * Convenient way to retrieve settings from the app manager plugin.
     */
    private getAppManagerSetting(settingName: string, defaultValue: string): Promise<string> {
        return this.storageLayer.get(settingName, defaultValue);
    }

    /**
     * Convenient way to save settings to the app manager plugin.
     */
    private setAppManagerSetting(settingName: string, value: string): Promise<void> {
        return this.storageLayer.set(settingName, value);
    }

    /**
     * Retrieve information about existing app instance info from permanent storage, if any.
     */
    public async getExistingAppInstanceDIDInfo(): Promise<{storeId: string, didString: string, storePassword: string}> {
        let storeId = await this.getAppManagerSetting("dappsdk_appinstancedidstoreid", null)
        let didString = await this.getAppManagerSetting("dappsdk_appinstancedidstring", null)
        let storePassword = await this.getAppManagerSetting("dappsdk_appinstancedidstorepassword", null)

        if (storeId && didString) {
            return {
                storeId: storeId,
                didString: didString,
                storePassword: storePassword
            };
        }

        return null;
    }

    /**
     * Saves app instance did info to permanent storage.
     */
    private async saveAppInstanceDIDInfo(storeId: string, didString: string, storePassword: string): Promise<void> {
        await this.setAppManagerSetting("dappsdk_appinstancedidstoreid", storeId);
        await this.setAppManagerSetting("dappsdk_appinstancedidstring", didString);
        // TODO: Devices with biometric auth enabled may use the password manager to save this password
        // more securely than in local storage.
        await this.setAppManagerSetting("dappsdk_appinstancedidstorepassword", storePassword);
    }

    /**
     * Creates a new application instance DID store, DID, and saves info to permanent storage.
     */
    private async createNewAppInstanceDID(): Promise<{didStore: DIDPlugin.DIDStore, did: DIDPlugin.DID}> {
        let didCreationResult = await this.fastCreateDID(DIDPlugin.MnemonicLanguage.ENGLISH);
        await this.saveAppInstanceDIDInfo(didCreationResult.didStore.getId(), didCreationResult.did.getDIDString(), didCreationResult.storePassword);

        return {
            didStore: didCreationResult.didStore,
            did: didCreationResult.did
        }
    }

    /**
     * Get the existing application instance DID if it was created before. Otherwise, a new app instance
     * DID is created and the information is stored in persistant storage for later use.
     */
    public async getOrCreateAppInstanceDID(): Promise<{did: DIDPlugin.DID, didStore: DIDPlugin.DIDStore}> {
        let didStore: DIDPlugin.DIDStore = null;
        let did: DIDPlugin.DID = null;

        this.logger.log("Getting or creating app instance DID");

        // Check if we have a app instance DID store saved in our local storage (app manager settings)
        let appInstanceDIDInfo = await this.getExistingAppInstanceDIDInfo();
        if (appInstanceDIDInfo) {
            // DID store found - previously created. Open it and get the app instance did.
            didStore = await this.openDidStore(appInstanceDIDInfo.storeId);
            if (didStore) { // Make sure the DID store could be loaded, just in case (abnormal case).
                did = await this.loadDID(didStore, appInstanceDIDInfo.didString);
            }
        }

        if (!didStore || !did) {
            this.logger.log("No app instance DID found. Creating a new one");

            // No DID store found. Need to create a new app instance DID.
            let didCreationresult = await this.createNewAppInstanceDID();
            didStore = didCreationresult.didStore;
            did = didCreationresult.did;
        }

        return {
            did: did,
            didStore: didStore
        };
    }

    public loadDIDCredentials(did: DIDPlugin.DID): Promise<DIDPlugin.VerifiableCredential[]> {
        return new Promise((resolve, reject)=>{
            did.loadCredentials((credentials)=>{
                resolve(credentials);
            }, (err)=> {
                reject(err);
            })
        });
    }

    /**
     * Gets the special app-id-credential from the app instance DID. This credential is delivered by
     * the identity dApp in elastOS and sign with user's DID, after user's approval, to confirm that
     * a calling dApp is really who it is. The credential contains the real app did used to publish it.
     */
    public async getOrCreateAppIdentityCredential(): Promise<DIDPlugin.VerifiableCredential> {
        return new Promise(async (resolve, reject)=>{
            let appInstanceDID = (await this.getOrCreateAppInstanceDID()).did;

            // Load credentials first before being able to call getCredential().
            await this.loadDIDCredentials(appInstanceDID);

            let credential = appInstanceDID.getCredential("#app-id-credential");
            if (credential) {
                // If credential exists but expiration date it too close, delete the current one and restart
                // the did app creation process.
                let expirationDate = moment(credential.getExpirationDate());
                if (expirationDate.isBefore(moment().subtract(1, 'hours'))) {
                    // We are expired - ask to generate a new credential
                    this.logger.log("Existing credential is expired or almost expired - renewing it");
                    credential = null;
                }
                else {
                    this.logger.log("Returning existing app id credential found in app's local storage");
                    resolve(credential);
                    return;
                }
            }

            if (!credential) {
                // No such credential, so we have to create one. Send an intent to get that from the did app
                this.logger.log("No app id credential found in app local storage. Trying to generate one.");

                try {
                    let credential = await this.appIDGenerator.generateAppIDCredential(appInstanceDID.getDIDString());

                    // TODO IMPORTANT: Check if the credential was issued by the user himself for security purpose, to make sure
                    // another app is not trying to issue and add a fake app-id-credential credential to user's profile
                    // by another way.

                    // Save this issued credential for later use.
                    appInstanceDID.addCredential(credential);

                    // This generated credential contains the following properties:
                    // appInstanceDid
                    // appDid

                    resolve(credential);
                }
                catch (err) {
                    reject(err);
                };
            }
        });
    }
}
