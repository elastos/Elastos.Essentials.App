import { Logger } from 'src/app/logger';
import { DIDHelper } from '../helpers/did.helper';
import { DIDURL } from './didurl.model';
import { VerifiableCredential } from './verifiablecredential.model';

export type CredentialAvatar = {
    "content-type": string,
    "type": string,
    "data": string
}

export class DID {
    public credentials: VerifiableCredential[] = [];

    constructor(public pluginDid: DIDPlugin.DID) {
    }

    public getDIDString() {
        return this.pluginDid.getDIDString();
    }

    public async loadAll() {
        await this.loadAllCredentials();
    }

    /**
     * Gets the list of unloaded credentials then load them one by one.
     * After this call, all credentials related to the active DID of this DID store are loaded
     * in memory.
     */
    async loadAllCredentials() {
        Logger.log("DIDSessions", "Loading credentials for DID", this);

        let pluginCredentials = await this.loadPluginCredentials();

        this.credentials = [];
        pluginCredentials.map((c)=>{
            this.credentials.push(new VerifiableCredential(c));
        })

        Logger.log("DIDSessions", "Current credentials list: ", this.credentials);
    }

    private loadPluginCredentials(): Promise<DIDPlugin.VerifiableCredential[]> {
        return new Promise((resolve, reject)=>{
            this.pluginDid.loadCredentials(
                (ret) => {resolve(ret)}, (err) => {reject(err)},
            );
        });
    }

    async addNameCredential(name: string, storePassword: string): Promise<void> {
        await this.addCredential(new DIDURL("#name"), {
            name: name
        }, storePassword, ["BasicProfileCredential"]);
    }

    /**
     */
    addCredential(credentialId: DIDURL, props: any, password: string, userTypes?: string[]): Promise<DIDPlugin.VerifiableCredential> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        return new Promise(async (resolve, reject)=>{
            Logger.log('didsessions', "Adding credential with id:", credentialId, props, userTypes);

            let types: string[] = [
                "SelfProclaimedCredential"
            ];
            // types[0] = "BasicProfileCredential";

            // If caller provides custom types, we add them to the list
            // NOTE: This is way too simple for now. We need to deal with types schemas in the future.
            if (userTypes) {
                userTypes.map((type)=>{
                    types.push(type);
                })
            }

            let credential: DIDPlugin.VerifiableCredential = null;
            try {
                Logger.log('didsessions', "Asking DIDService to create the credential with id "+credentialId);
                // the max validity days is 5*365 (5 years).
                credential = await this.createPluginCredential(credentialId, types, 5*365, props, password);
                Logger.log('didsessions', "Created credential:",JSON.parse(JSON.stringify(credential)));
            }
            catch (e) {
                Logger.error('didsessions', "Create credential exception", e);
                reject(DIDHelper.reworkedPluginException(e))
                return;
            }

            await this.addPluginCredential(credential);

            resolve(credential);
        });
    }

    private createPluginCredential(credentialId: DIDURL, type, validityDays, properties, passphrase): Promise<DIDPlugin.VerifiableCredential> {
        return new Promise((resolve, reject)=>{
            this.pluginDid.issueCredential(
                this.getDIDString(), credentialId.toString(), type, validityDays, properties, passphrase,
                (ret) => {resolve(ret)},
                (err) => {reject(DIDHelper.reworkedPluginException(err))},
            );
        });
    }

    private addPluginCredential(credential: DIDPlugin.VerifiableCredential): Promise<void> {
        Logger.log('didsessions', "DIDService - storeCredential", this.getDIDString(), JSON.parse(JSON.stringify(credential)));
        return new Promise((resolve, reject)=>{
            Logger.log('didsessions', "DIDService - Calling real storeCredential");
            this.pluginDid.addCredential(
                credential,
                () => {
                    resolve()
                }, (err) => {
                    Logger.error('didsessions', "Add credential exception", err);
                    reject(DIDHelper.reworkedPluginException(err));
                },
            );
        });
    }

    /**
     * Retrieves the "#name" verifiable credential value in this did, if any.
     */
    getNameCredentialValue(): string {
        for (let credential of this.credentials) {
            if (new DIDURL(credential.pluginVerifiableCredential.getId()).matches("#name")) {
                let subject = credential.pluginVerifiableCredential.getSubject();
                return subject.name;
            }
        }
        return null;
    }

    /**
     * Retrieves the "#avatar" credential value, if any.
     */
    getAvatarCredentialValue(): CredentialAvatar {
        for (let credential of this.credentials) {
            if (new DIDURL(credential.pluginVerifiableCredential.getId()).matches("#avatar")) {
                let subject = credential.pluginVerifiableCredential.getSubject();
                if (subject.avatar)
                    return subject.avatar as CredentialAvatar;
                else
                    return null;
            }
        }
        return null;
    }
}