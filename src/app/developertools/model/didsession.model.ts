import { CLIApp } from "./cliapp.model";
import { AppPublicationCredentialSubject } from "./apppubcredsubject.model";
import { Logger } from "src/app/logger";

declare let appManager: AppManagerPlugin.AppManager;
declare let didManager: DIDPlugin.DIDManager;

export class DIDSession {
    didStore: DIDPlugin.DIDStore;
    didString: string;
    mnemonic: string;
    storePassword: string;
    didDocument: DIDPlugin.DIDDocument;
    did: DIDPlugin.DID;

    onGoingIdTransactionResolve: (value?: any | PromiseLike<any>) => void;
    onGoingIdTransactionReject: (reason?: any) => void;

    public static create(didStoreId: string, didString: string, storePassword: string): Promise<DIDSession> {
        Logger.log("developertools", "Creating a new DID session");

        let session = new DIDSession();
        session.didString = didString;
        session.storePassword = storePassword;

        return new Promise((resolve, reject) => {
            didManager.initDidStore(didStoreId, (payload, memo) => {
                // Create ID transaction
                Logger.log("developertools", "Create id transaction callback called");
                session.createIdTransactionCallback(payload as string, memo);
            }, (didStore) => {
                session.didStore = didStore;
                didStore.exportMnemonic(storePassword, (mnemonic) => {
                    session.mnemonic = mnemonic;

                    didStore.listDids(DIDPlugin.DIDStoreFilter.DID_HAS_PRIVATEKEY, dids => {
                        if (!dids || dids.length == 0) {
                            reject("No DID found in the did store. Create a DID session only when a store and a DID have been created.");
                        }
                        else {
                            session.did = dids[0];

                            // Finally our session is ready with all the information we need.
                            resolve(session);
                        }
                    });
                }, (err) => {
                    reject(err);
                });
            }, (err) => {
                reject(err);
            })
        });
    }

    /**
     * Gets the latest DID document from chain
     */
    public synchronizeDIDDocument(): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve, reject) => {
            // Get the latest DID document from chain, if any.
            Logger.log("developertools", "Synchronizing the DID store");
            this.didStore.synchronize(this.storePassword, () => {
                // Now that we are synced, load the existing DID document (could be empty)
                Logger.log("developertools", "Loading local DID document");
                this.didStore.loadDidDocument(this.didString, didDocument => {
                    this.didDocument = didDocument;
                    resolve(didDocument);
                }, err => {
                    reject(err);
                });
            }, err => {
                reject(err);
            });
        });
    }

    /**
     * Updates the app's did document with all the required info that we have locally
     */
    public async updateDIDDocument(developerDID: string, nativeRedirectUrl: string, nativeCallbackUrl: string, nativeCustomScheme: string): Promise <void> {
        Logger.log("developertools", "DID Session debug (did):", this.did);
        Logger.log("developertools", "DID Session debug (didDocument):", this.didDocument);
        Logger.log("developertools", "DID Session debug (didStore):", this.didStore);

        await this.updateDIDDocumentsWithDeveloperDID(developerDID);
        await this.updateDIDDocumentsWithNativeUrls(nativeRedirectUrl, nativeCallbackUrl, nativeCustomScheme);
    }

    private updateDIDDocumentsWithDeveloperDID(developerDID: string): Promise <void> {
        let properties = {
            did: developerDID
        };
        return this.updateDIDDocumentsWithCredential("#developer", properties, "DappDeveloperCredential");
    }

    private updateDIDDocumentsWithNativeUrls(nativeRedirectUrl: string, nativeCallbackUrl: string, nativeCustomScheme: string): Promise <void> {
        let properties = {
            redirectUrl: nativeRedirectUrl,
            callbackUrl: nativeCallbackUrl,
            customScheme: nativeCustomScheme
        };
        return this.updateDIDDocumentsWithCredential("#native", properties, "NativeAppCredential");
    }

    private updateDIDDocumentsWithCredential(credentialName: string, properties: any, credentialType: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let validityDays: any = 5 * 365; // 5 years

            // Create a new credential that contains all the app info, in our local DID
            this.did.issueCredential(this.didString, credentialName, [credentialType], validityDays, properties, this.storePassword, async credential => {
                Logger.log("developertools", "Credential issued:", credential);
                // Also add this credential into the local DID document, ready for publishing.

                Logger.log("developertools", "Removing existing credential "+credentialName+" if any");
                await this.deleteExistingCredentialIfAny(credentialName);

                Logger.log("developertools", "Adding the new "+credentialName+" credential to the DID document");
                this.didDocument.addCredential(credential, this.storePassword, () => {
                    Logger.log("developertools", "DIDDocument after update: ", this.didDocument)
                    resolve();
                }, err => {
                    reject(err);
                });
            }, err => {
                reject(err);
            });
        });
    }

    private deleteExistingCredentialIfAny(credentialName: string): Promise<void> {
        return new Promise(async (resolve, reject)=>{
            let credential = this.didDocument.getCredential(credentialName);
            if (credential) {
                this.didDocument.deleteCredential(credential, this.storePassword, ()=>{
                    resolve();
                }, (err)=>{
                    reject(err);
                });
            }
            else {
                // Do nothing, no such credential yet.
                resolve();
            }
        });
    }

    public publishDIDDocument(): Promise < void> {
        return new Promise((resolve, reject) => {
            //DIDSession.onGoingIdTransactionSession = this;
            this.onGoingIdTransactionResolve = resolve;
            this.onGoingIdTransactionReject = reject;

            Logger.log("developertools", "Publishing DID document");
            this.didDocument.publish(this.storePassword, () => {
            }, err => {
                reject(err);
            });
        });
    }

    /**
     * This callback is called after calling publish() on a DIDDocument. It returns a DID request payload
     * that we have to forward to the wallet application so it can write the did request on the did
     * sidechain for us.
     */
    private async createIdTransactionCallback(payload: string, memo: string) {
        let jsonPayload = JSON.parse(payload);
        Logger.log("developertools", "Received id transaction callback with payload: ", jsonPayload, payload);
        let params = {
            didrequest: jsonPayload
        }

        try {
            Logger.log("developertools", "Sending didtransaction intent with params:", params);
            let response = await appManager.sendIntent("https://wallet.elastos.net/didtransaction", params);
            Logger.log("developertools", "Got didtransaction intent response.", response);

            // If txid is set in the response this means a transaction has been sent on chain.
            // If null, this means user has cancelled the operation (no ELA, etc).
            if (response && response.result && response.result.txid) {
                Logger.log("developertools", 'didtransaction response.result.txid ', response.result.txid);
                this.onGoingIdTransactionResolve();
            }
            else {
                Logger.log("developertools", 'didtransaction response content or response.result.txid is null');
                this.onGoingIdTransactionReject("DID transaction operation cancelled");
            }
        }
        catch (err) {
            this.onGoingIdTransactionReject(err);
        }
    }
}