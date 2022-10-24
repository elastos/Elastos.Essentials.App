import { VerifiableCredential, VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import { Interfaces, Wallet } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { CredentialDisclosureRequest } from "@elastosfoundation/elastos-connectivity-sdk-js/typings/did";
import { lazyElastosDIDSDKImport } from "../helpers/import.helper";
import { DIDURL } from "../identity/model/didurl.model";
import { AuthService } from "../identity/services/auth.service";
import { DIDService } from "../identity/services/did.service";
import { Logger } from "../logger";

declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;
//declare let didManager: DIDPlugin.DIDManager;

/**
 * This internal elastos connector creates a window.elastosconnectivity context INSIDE
 * the essentials app itself. It is currently used by:
 * - The hive helper, to create app id credentials
 * - The news widgets, for feeds authentication
 */
export class InternalElastosConnector implements Interfaces.Connectors.IConnector {
    public name = "essentials-internal";

    // eslint-disable-next-line require-await
    async getDisplayName(): Promise<string> {
        return "Essentials Internal connector";
    }

    /**
     * DID API
     */

    getCredentials(claims: any): Promise<VerifiablePresentation> {
        throw new Error("getCredentials(): Method not implemented.");
    }

    /**
     * For feeds SDK: return an empty presentation, HOPING that all credentials
     * are optional for now.
     */
    requestCredentials(request: CredentialDisclosureRequest): Promise<VerifiablePresentation> {
        return new Promise(resolve => {
            void AuthService.instance.checkPasswordThenExecute(async () => {
                // TODO - REMOVE WHEN WE CAN - Mandatory for feeds for now
                let nameCred = DIDService.instance.getActiveDid().getCredentialById(new DIDURL("#name"));
                //let nameCredJson = await nameCred.pluginVerifiableCredential.toJson()

                //let nameCredJS = await VerifiableCredential.parse(nameCredJson);

                const presentation = await DIDService.instance.getActiveDid().createVerifiablePresentationFromCredentials(
                    [nameCred.pluginVerifiableCredential],
                    AuthService.instance.getCurrentUserPassword(),
                    request.nonce, request.realm);
                Logger.log('connector', "Created presentation:", presentation);

                // Convert from Cordova VP to DID JS VP
                let vpJson = await presentation.toJson();
                const didJSPresentation = VerifiablePresentation.parse(vpJson);
                resolve(didJSPresentation);
            }, () => {
                // Cancelled
                resolve(null);
            });
        });
    }

    generateAppIdCredential(appInstanceDID: string): Promise<VerifiableCredential> {
        Logger.log("connector", "App ID Credential generation flow started");

        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject) => {
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
                const { VerifiableCredential } = await lazyElastosDIDSDKImport();
                let credential = VerifiableCredential.parse(res.result.credential);
                resolve(credential);
            }
            catch (err) {
                Logger.error("connector", "generateAppIDCredential() error:", err);
                resolve(null);
            }
        });
    }

    getWeb3Provider() {
        throw new Error("Method not implemented.");
    }

    /**
     * Wallet API
     */

    pay(query: Wallet.PayQuery): Promise<Wallet.TransactionResult> {
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