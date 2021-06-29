import { Injectable, NgZone } from "@angular/core";
import { DIDService } from "./did.service";
import { Native } from "./native";
import { DID } from "../model/did.model";
import { DIDSyncService } from "./didsync.service";
import { isNil } from "lodash-es";
import { DIDDocument } from "../model/diddocument.model";

import * as moment from 'moment';
import { Logger } from "src/app/logger";

export interface ExpiredItem {
    id: string,
    did: string,
    message: string,
    daysToExpire: number,
}

@Injectable({
    providedIn: 'root'
})
export class ExpirationService {
    constructor(
        private didService: DIDService,
        private didSyncService: DIDSyncService,
        public native: Native) {
    }

    public async getElementsAboutToExpireOnActiveDID(maxDaysToExpire: number) : Promise<ExpiredItem[]> {
        let expiredItems : ExpiredItem[] = []

        let did : DID = this.didService.getActiveDid();
        let didDocument : DIDDocument = did.getDIDDocument();

        //verify if active DID is about to expire
        let didExpirationItem = this.verifyDIDExpiration(did.getDIDString(), didDocument, maxDaysToExpire)
        if (didExpirationItem !== null && didExpirationItem.daysToExpire <= maxDaysToExpire)
            expiredItems.push(didExpirationItem)


        //Get all Verifiable Credentials and verify if is about to expire.
        let credentials: DIDPlugin.VerifiableCredential[] = didDocument.getCredentials()
        await credentials.forEach(async (credential) =>{
            //verify if credential is not self proclaimed and is about to expire
            let credentialExpiredItem = this.verifyCredentialExpiration(did.getDIDString(), credential, maxDaysToExpire)
            if (credentialExpiredItem !== null && credentialExpiredItem.daysToExpire <= maxDaysToExpire)
                expiredItems.push(credentialExpiredItem);

            //Verify if credential have an issuer and the issuer DID is about to expire
            let issuerDIDExpiredItem = await this.verifyIssuerDIDExpiration(did.getDIDString(), credential, maxDaysToExpire)
            if (issuerDIDExpiredItem !== null && issuerDIDExpiredItem.daysToExpire <= maxDaysToExpire)
                expiredItems.push(issuerDIDExpiredItem);
        })
        return expiredItems
    }

    public verifyDIDExpiration(did: string, didDocument: DIDDocument, maxDaysToExpire: number) : ExpiredItem
    {
        let daysToActiveDIDExpire : number = this.daysToExpire(didDocument.getExpires())

        Logger.log("identity", "Days to Active DID expire", daysToActiveDIDExpire)

        let didExpiredMessage = this.constructPersonalMessage("Your DID", daysToActiveDIDExpire);
        //add new expired item response for this DID
        return {
            id: did,
            did: did,
            message: didExpiredMessage,
            daysToExpire: daysToActiveDIDExpire
        }
    }

    public verifyCredentialExpiration(did: string, credential: DIDPlugin.VerifiableCredential, maxDaysToExpire: number): ExpiredItem{

        // If credential is Self Proclaimed, not verify expiration
        if (credential.getTypes().includes("SelfProclaimedCredential")) return null

        let daysToCredentialExpire: number = this.daysToExpire(credential.getExpirationDate())

        Logger.log("identity", `Days to ${this.getCredentialID(did, credential)} expire`, daysToCredentialExpire)


        let credentialExpiredMessage = this.constructPersonalMessage(`Your ${this.getCredentialID(did, credential)} credential`, daysToCredentialExpire)
        //add new expired item response for this credential
        return {
            id: `${did}_${this.getCredentialID(did, credential)}`,
            did: did,
            message: credentialExpiredMessage,
            daysToExpire: daysToCredentialExpire
        }

    }

    public async verifyIssuerDIDExpiration(did: string, credential: DIDPlugin.VerifiableCredential, maxDaysToExpire: number) : Promise<ExpiredItem>  {
        let issuerDID: string = credential.getIssuer();
        if (isNil(issuerDID) || issuerDID === "" || issuerDID === did) return null

        //Get issuer DID document
        let issuerDocument : DIDDocument = await this.didSyncService.getDIDDocumentFromDID(issuerDID);

        //verify if issuer DID is about to expire
        let daysToIssuerDIDExpire : number = this.daysToExpire(issuerDocument.getExpires())

        Logger.log("identity", `Days to validator DID for ${this.getCredentialID(did, credential)} credential expire in `, daysToIssuerDIDExpire)


        let issuerExpiredMessage: string = this.constructIssuerMessage(`The validator DID for ${this.getCredentialID(did, credential)} credential`, daysToIssuerDIDExpire);
        //add new expired item response for this issuer DID
        return {
            id: `${did}_${this.getCredentialID(did, credential)}_${issuerDID}}`,
            did: issuerDID,
            message: issuerExpiredMessage,
            daysToExpire: daysToIssuerDIDExpire
        }

    }

    private daysToExpire(date: Date) : number
    {
        var expiration = moment(date, moment.ISO_8601);
        var today = moment({});
        return  expiration.diff(today, 'days')
    }

    private getCredentialID(did: string, item: DIDPlugin.VerifiableCredential){
        return item.getId().replace(did, "").replace("#", "");
    }

    private constructPersonalMessage(element: string, daysToExpire: number): string
    {
        if (daysToExpire > 1)
            return `${element} is about to expire in ${daysToExpire} days. It's not too late to renew it.`

        if (daysToExpire == 1)
            return `${element} is going to expire tomorrow. Your clock is ticking fast.`

        if (daysToExpire == 0)
            return `${element} is expiring today. It's time to renew.`

        return `${element} is expired. Renew it and continue to use it.`
    }

    private constructIssuerMessage(element: string, daysToExpire: number): string
    {
        if (daysToExpire > 1)
            return `${element} is about to expire in ${daysToExpire} days. Renew your credential soon is possible and continue to use it.`

        if (daysToExpire == 1)
            return `${element} is go to expire tomorrow. Renew your credential soon is possible and continue to use it.`

        if (daysToExpire == 0)
            return `${element} is expiring today. Renew your credential soon is possible and continue to use it.`

        return `${element} is expired. Renew your credential soon is possible and continue to use it.`
    }

}