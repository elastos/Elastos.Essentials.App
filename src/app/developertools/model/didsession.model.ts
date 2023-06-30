import moment from "moment";
import { Logger } from "src/app/logger";
import { DIDPublicationStatus, GlobalPublicationService } from "src/app/services/global.publication.service";

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
    public async updateDIDDocument(developerDID: string, appName: string, appIconUrl: string, nativeRedirectUrl: string, nativeCallbackUrl: string, nativeCustomScheme: string): Promise<void> {
        Logger.log("developertools", "DID Session debug (did):", this.did);
        Logger.log("developertools", "DID Session debug (didDocument):", this.didDocument);
        Logger.log("developertools", "DID Session debug (didStore):", this.didStore);

        let properties = {
            name: appName,
            iconUrl: appIconUrl,
            developer: {
                did: developerDID
            },
            endpoints: {
                redirectUrl: nativeRedirectUrl,
                callbackUrl: nativeCallbackUrl,
                customScheme: nativeCustomScheme
            }
        };
        await this.updateDIDDocumentsWithApplicationCredential("#appinfo", properties, "ApplicationCredential");
    }

    private updateDIDDocumentsWithApplicationCredential(credentialName: string, properties: any, credentialType: string): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise((resolve, reject) => {
            let dateCurrent = moment();
            let validityDays: any = moment().add(5, 'year').diff(dateCurrent, 'day'); // 5 years

            // Create a new credential that contains all the app info, in our local DID
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
            this.did.issueCredential(this.didString, credentialName, [credentialType], validityDays, properties, this.storePassword, async credential => {
                Logger.log("developertools", "Credential issued:", credential);
                // Also add this credential into the local DID document, ready for publishing.

                Logger.log("developertools", "Removing existing credential " + credentialName + " if any");
                await this.deleteExistingCredentialIfAny(credentialName);

                Logger.log("developertools", "Adding the new " + credentialName + " credential to the DID document");
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
                this.didDocument.deleteCredential(credential, this.storePassword, () => {
                    resolve();
                }, (err) => {
                    reject(err);
                });
            }
            else {
                // Do nothing, no such credential yet.
                resolve();
            }
        });
    }

    /**
     * Publishes the DID and resolves only after publishing is complete.
     */
    public publishDIDDocument(): Promise<boolean> {
        return new Promise(resolve => {
            void GlobalPublicationService.instance.resetStatus().then(async () => {
                let publicationStatusSub = GlobalPublicationService.instance.publicationStatus.subscribe((status) => {
                    if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
                        Logger.log("developertools", "Identity publication success");
                        publicationStatusSub.unsubscribe();
                        resolve(true);
                    }
                    else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
                        Logger.log("developertools", "Identity publication failure");
                        publicationStatusSub.unsubscribe();
                        resolve(false);
                    }
                });

                try {
                    await GlobalPublicationService.instance.publishCordovaDIDFromStore(
                        this.didStore.getId(),
                        this.storePassword, this.didString, true);
                }
                catch (e) {
                    Logger.log("didsessions", "Identity publication failure (publishDIDFromStore)", e);
                    publicationStatusSub.unsubscribe();
                    resolve(false);
                }
            });
        });
    }
}