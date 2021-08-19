import { CLIApp } from "./cliapp.model";
import { AppPublicationCredentialSubject } from "./apppubcredsubject.model";
import { Logger } from "src/app/logger";
import { GlobalPublicationService } from "src/app/services/global.publication.service";

declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;
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
                Logger.warn("developertools", "Create id transaction callback called, but it's empty!");
            }, (didStore) => {
                session.didStore = didStore;
                didStore.exportMnemonic(storePassword, (mnemonic) => {
                    session.mnemonic = mnemonic;

                    didStore.listDids("DID_HAS_PRIVATEKEY", dids => {
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise((resolve, reject) => {
            let validityDays: any = 5 * 365; // 5 years

            // Create a new credential that contains all the app info, in our local DID
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise((resolve, reject) => {
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

    public async publishDIDDocument(): Promise < void> {
        await GlobalPublicationService.instance.publishDIDFromStore(
            this.didStore.getId(),
            this.storePassword, this.didString, true);
    }
}