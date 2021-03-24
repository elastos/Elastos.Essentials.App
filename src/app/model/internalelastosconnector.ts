import { Interfaces } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { PayQuery, TransactionResult } from "@elastosfoundation/elastos-connectivity-sdk-cordova/dist/wallet";
import { Logger } from "../logger";

declare let essentialsIntent: EssentialsIntentPlugin.Intent;
declare let didManager: DIDPlugin.DIDManager;

export class InternalElastosConnector implements Interfaces.Connectors.IConnector {
    public name: string = "essentials-internal";

    async getDisplayName(): Promise<string> {
        return "Essentials Internal connector";
    }

    /**
     * DID API
     */

    getCredentials(claims: any): Promise<DIDPlugin.VerifiablePresentation> {
        throw new Error("getCredentials(): Method not implemented.");
    }

    generateAppIdCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential> {
        Logger.log("connector", "App ID Credential generation flow started");

        return new Promise(async (resolve, reject)=>{
            try {
                // No such credential, so we have to create one. Send an intent to get that from the did app
                let res: { result: { credential: string } } = await essentialsIntent.sendIntent("https://did.elastos.net/appidcredissue", {
                    appinstancedid: appInstanceDID
                });

                console.log("Got response for the appidcredissue intent", res);

                if (!res || !res.result || !res.result.credential) {
                    console.warn("Missing credential information. The operation was maybe cancelled.");
                    resolve(null);
                    return;
                }
                let credential = didManager.VerifiableCredentialBuilder.fromJson(res.result.credential);
                resolve(credential);
            }
            catch (err) {
                console.log("generateAppIDCredential() error:", err);
                resolve(null);
            }
        });
    }

    /**
     * Wallet API
     */

    async pay(query: PayQuery): Promise<TransactionResult>  {
        throw new Error("pay(): Method not implemented.");
    }

    async voteForDPoS() {
        throw new Error("voteForDPoS(): Method not implemented.");
    }

    async voteForCRCouncil() {
        throw new Error("voteForCRCouncil(): Method not implemented.");
    }

    async voteForCRProposal() {
        throw new Error("voteForCRProposal(): Method not implemented.");
    }

    async sendSmartContractTransaction(payload: any): Promise<string> {
        throw new Error("sendSmartContractTransaction(): Method not implemented.");
    }
}