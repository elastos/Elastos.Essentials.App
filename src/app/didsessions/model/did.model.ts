import { DIDURL } from './didurl.model';
import { DIDHelper } from '../helpers/did.helper';
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
        console.log("Loading credentials for DID", this);

        let pluginCredentials = await this.loadPluginCredentials();

        this.credentials = [];
        pluginCredentials.map((c)=>{
            this.credentials.push(new VerifiableCredential(c));
        })

        console.log("Current credentials list: ", this.credentials);
    }

    private loadPluginCredentials(): Promise<DIDPlugin.VerifiableCredential[]> {
        return new Promise(async (resolve, reject)=>{
            this.pluginDid.loadCredentials(
                (ret) => {resolve(ret)}, (err) => {reject(err)},
            );
        });
    }

    async addNameCredential(name: string, storePassword: string): Promise<void> {
        try {
            await this.addCredential(new DIDURL("#name"), {
                name: name
            }, storePassword, ["BasicProfileCredential"]);
        }
        catch (e) {
            throw e;
        }
    }

    /**
     */
    async addCredential(credentialId: DIDURL, props: any, password: string, userTypes?: String[]): Promise<DIDPlugin.VerifiableCredential> {
        return new Promise(async (resolve, reject)=>{
            console.log("Adding credential with id:", credentialId, props, userTypes);

            let types: String[] = [
                "SelfProclaimedCredential"
            ];
            // types[0] = "BasicProfileCredential";

            // If caller provides custom types, we add them to the list
            // TODO: This is way too simple for now. We need to deal with types schemas in the future.
            if (userTypes) {
                userTypes.map((type)=>{
                    types.push(type);
                })
            }

            let credential: DIDPlugin.VerifiableCredential = null;
            try {
                console.log("Asking DIDService to create the credential with id "+credentialId);
                // the max validity days is 5*365 (5 years).
                credential = await this.createPluginCredential(credentialId, types, 5*365, props, password);
                console.log("Created credential:",JSON.parse(JSON.stringify(credential)));
            }
            catch (e) {
                console.error("Create credential exception", e);
                reject(DIDHelper.reworkedPluginException(e))
                return;
            }

            await this.addPluginCredential(credential);

            resolve(credential);
        });
    }

    private createPluginCredential(credentialId: DIDURL, type, validityDays, properties, passphrase): Promise<DIDPlugin.VerifiableCredential> {
        return new Promise(async (resolve, reject)=>{
            this.pluginDid.issueCredential(
                this.getDIDString(), credentialId.toString(), type, validityDays, properties, passphrase,
                (ret) => {resolve(ret)},
                (err) => {reject(DIDHelper.reworkedPluginException(err))},
            );
        });
    }

    private addPluginCredential(credential: DIDPlugin.VerifiableCredential): Promise<void> {
        console.log("DIDService - storeCredential", this.getDIDString(), JSON.parse(JSON.stringify(credential)));
        return new Promise(async (resolve, reject)=>{
            console.log("DIDService - Calling real storeCredential");
            this.pluginDid.addCredential(
                credential,
                () => {
                    resolve()
                }, (err) => {
                    console.error("Add credential exception", err);
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