import { Interfaces, Wallet } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { Logger } from "../logger";

declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;
declare let didManager: DIDPlugin.DIDManager;

export class InternalElastosConnector implements Interfaces.Connectors.IConnector {
    public name = "essentials-internal";

    // eslint-disable-next-line require-await
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

        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject)=>{
            try {
                // No such credential, so we have to create one. Send an intent to get that from the did app
                let res: { result: { credential: string } } = await essentialsIntentManager.sendIntent("https://did.elastos.net/appidcredissue", {
                    appinstancedid: appInstanceDID
                });

                Logger.log("connector", "Got response for the appidcredissue intent", res);

                if (!res || !res.result || !res.result.credential) {
                    console.warn("Missing credential information. The operation was maybe cancelled.");
                    resolve(null);
                    return;
                }
                let credential = didManager.VerifiableCredentialBuilder.fromJson(res.result.credential);
                resolve(credential);
            }
            catch (err) {
                Logger.error("connector", "generateAppIDCredential() error:", err);
                resolve(null);
            }
        });
    }

    /**
     * Wallet API
     */

    pay(query: Wallet.PayQuery): Promise<Wallet.TransactionResult>  {
        throw new Error("pay(): Method not implemented.");
    }

    voteForDPoS(): Promise<void> {
        throw new Error("voteForDPoS(): Method not implemented.");
    }

    voteForCRCouncil(): Promise<void> {
        throw new Error("voteForCRCouncil(): Method not implemented.");
    }

    voteForCRProposal(): Promise<void> {
        throw new Error("voteForCRProposal(): Method not implemented.");
    }

    sendSmartContractTransaction(payload: any): Promise<string> {
        throw new Error("sendSmartContractTransaction(): Method not implemented.");
    }
}