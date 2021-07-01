import { DIDURL } from './didurl.model';
import { Logger } from 'src/app/logger';
import { DIDHelper } from 'src/app/helpers/did.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';

declare let didManager: DIDPlugin.DIDManager;

export class DIDDocument {

    public timer = 0;
    private didString: string;


    public static getDIDDocumentFromDIDString(didString: string): Promise<DIDDocument> {
        if (didString.indexOf(':') == -1) {
            didString = "did:elastos:" + didString;
        }
        return new Promise((resolve, reject)=>{
            didManager.resolveDidDocument(didString, true, (document)=>{
                Logger.log("DIDDocument", "DIDDocument resolved from did string " + didString, document);
                if (document != null) {
                    let doc = new DIDDocument(document);
                    resolve(doc);
                }
                else {
                    resolve(null);
                }
            }, (err)=>{
                reject(err);
            });
        });
    }

    constructor(
        public pluginDidDocument: DIDPlugin.DIDDocument,
    ) {
        this.didString = this.pluginDidDocument.getSubject().getDIDString();
    }

    public async getAvatar(): Promise<string> {
        let credentials = this.pluginDidDocument.getCredentials();
        for (let credential of credentials) {
            let subject = credential.getSubject();
            if ("avatar" in subject) {
                let avatar = subject.avatar;
                if (avatar.hasOwnProperty("data")) {
                    return "data:image/png;base64," + avatar.data;
                }
                else {
                    return avatar;
                }
            }
        }
        return null;
    }


    public addCredential(credential: DIDPlugin.VerifiableCredential, storePass: string): Promise<void> {
        Logger.log('Identity', "Adding credential with key " + credential.getId() + " into DIDDocument", JSON.parse(JSON.stringify(credential)));

        return new Promise((resolve, reject) => {
            this.pluginDidDocument.addCredential(
                credential,
                storePass,
                async () => {
                    await this.markUpdated();
                    resolve()
                }, (err) => {
                    Logger.error('identity', "Add credential exception", err);
                    reject(DIDHelper.reworkedPluginException(err));
                },
            );
        });
    }

    public deleteCredential(credential: DIDPlugin.VerifiableCredential, storePass: string): Promise<void> {
        Logger.log('Identity', "Delete credential with key " + credential.getId() + " from the DIDDocument", JSON.parse(JSON.stringify(credential)));
        return new Promise((resolve, reject) => {
            this.pluginDidDocument.deleteCredential(
                credential,
                storePass,
                async () => {
                    await this.markUpdated();
                    resolve()
                }, (err) => {
                    Logger.error('identity', "Delete credential exception", err);
                    reject(DIDHelper.reworkedPluginException(err));
                },
            );
        });
    }

    public createJWT(properties: any, validityDays: number, storePass: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.pluginDidDocument.createJWT(properties, validityDays, storePass, async (jwtToken) => {
                resolve(jwtToken);
            }, (err) => {
                Logger.error('identity', "Delete credential exception", err);
                reject(DIDHelper.reworkedPluginException(err));
            });
        });
    }

    /**
     * Convenient way to add a credential if not existing, and update it if existing
     */
    public async updateOrAddCredential(credential: DIDPlugin.VerifiableCredential, storePass: string): Promise<void> {
        if (this.getCredentialById(new DIDURL(credential.getId()))) {
            // Already exists? Delete it first
            await this.deleteCredential(credential, storePass);
        }
        await this.addCredential(credential, storePass);
    }

    public async getUpdated(): Promise<Date> {
        if (!this.pluginDidDocument.getUpdated()) {
            // No updated date provided in the DID document: fallback to our own locally saved "updated"
            let storedDateString = await GlobalStorageService.instance.getSetting(this.didString, 'diddocument', "updated", null);
            return new Date(storedDateString);
        }
        return new Date();
    }

    /**
     * Because currently the DID SDK maintains a "updated" date only for on-chain documents (updated = transaction date),
     * local did documents need a separate local storage hack to save their "updated" date and be able to compare
     * it with remote document date later on.
     */
    private async markUpdated() {
        await GlobalStorageService.instance.setSetting(this.didString, 'diddocument', "updated", (new Date()).toISOString());
    }

    setCounter() {
        this.timer = 300; // 5 minutes/300 seconds
        let countdownTimer = setInterval(() => {
            this.timer--;
            if (this.timer <= 0) {
                clearInterval(countdownTimer);
            }
        }, 1000);
    }

    /**
     * Retrieve a credential from the given credential id.
     */
    getCredentialById(credentialId: DIDURL): DIDPlugin.VerifiableCredential {
        let credentials = this.getCredentials();
        return credentials.find((c) => {
            return credentialId.matches(c.getId());
        });
    }

    getCredentials(): DIDPlugin.VerifiableCredential[] {
        return this.pluginDidDocument.getCredentials();
    }

    getExpires(): Date {
        return this.pluginDidDocument.getExpires();
    }

    /**
     * Start publishing this DID document on chain.
     * Response will be received in DIDStore.createIdTransactionCallback().
     */
    publish(storepass: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.timer <= 0) {
                this.pluginDidDocument.publish(
                    storepass,
                    () => {
                        // Set timer so user can't publish more than once in 5 minutes
                        this.setCounter()
                        resolve()
                    },
                    (err) => {
                        reject(DIDHelper.reworkedPluginException(err))
                    },
                );
            } else {
                reject(new Error('identity.publish-wait'));
            }
        });
    }

    getDefaultPublicKey(): Promise<DIDPlugin.Base58PublicKey> {
        return new Promise((resolve, reject) => {
            this.pluginDidDocument.getDefaultPublicKey((publicKey: DIDPlugin.PublicKey) => {
                Logger.log('Identity', JSON.stringify(publicKey))
                let base58Key = publicKey.getPublicKeyBase58();
                resolve(base58Key);
            }, (err) => {
                reject(err);
            })
        });
    }

    public addService(service: DIDPlugin.Service, storePass: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pluginDidDocument.addService(service, storePass, async () => {
                resolve();
            }, (err) => {
                Logger.error('identity', "AddService exception", err);
                reject(DIDHelper.reworkedPluginException(err));
            });
        });
    }

    getServices(): DIDPlugin.Service[] {
        return this.pluginDidDocument.getServices();
    }

    getService(didurl: DIDPlugin.DIDURL): DIDPlugin.Service {
        return this.pluginDidDocument.getService(didurl);
    }

    public removeService(didUrl: DIDPlugin.DIDURL, storePass: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pluginDidDocument.removeService(didUrl, storePass, async () => {
                resolve();
            }, (err) => {
                Logger.error('identity', "RemoveService exception", err);
                reject(DIDHelper.reworkedPluginException(err));
            });
        });
    }
}
