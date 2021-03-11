import * as ElastosConnectivitySDK from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { DID } from "./did/did";
import { Wallet } from "./wallet/wallet";

export class EssentialsConnector implements ElastosConnectivitySDK.Interfaces.Connectors.IConnector {
    public name: string = "essentials";

    /**
     * DID API
     */

    getCredentials(claims: any): Promise<DIDPlugin.VerifiablePresentation> {
        throw new Error("Method not implemented.");
    }

    generateAppIdCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential> {
        return DID.generateAppIDCredential(appInstanceDID);
    }

    /**
     * Wallet API
     */

    async pay() {
        throw new Error("Method not implemented.");
    }

    async voteForDPoS() {
        throw new Error("Method not implemented.");
    }

    async voteForCRCouncil() {
        throw new Error("Method not implemented.");
    }

    async voteForCRProposal() {
        throw new Error("Method not implemented.");
    }

    sendSmartContractTransaction(payload: any) {
        return Wallet.sendSmartContractTransaction(payload);
    }
}