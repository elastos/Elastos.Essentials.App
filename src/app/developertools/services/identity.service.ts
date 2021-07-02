import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSession } from '../model/didsession.model';

declare let didManager: DIDPlugin.DIDManager;

@Injectable({
    providedIn: 'root'
})
export class IdentityService {
    constructor(
        private storage: GlobalStorageService,
        private didSessions: GlobalDIDSessionsService) {}

    /**
     * Queries the DID sidechain to check if the given app DID is published or not.
     */
    public getAppIdentityOnChain(appDID: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve, reject)=>{
            Logger.log("developertools", "Get app identity on chain - Resolving appDID", appDID);
            didManager.resolveDidDocument(appDID, true, (document)=>{
                resolve(document);
            }, (err)=>{
                reject(err);
            });
        });
    }

    public getDeveloperIdentityOnChain(developerDID: string): Promise<DIDPlugin.DIDDocument> {
        if (!developerDID)
            return null;

        return new Promise((resolve, reject)=>{
            Logger.log("developertools", "Get developer identity on chain - Resolving developerDID", developerDID);
            didManager.resolveDidDocument(developerDID, true, (document)=>{
                resolve(document);
            }, (err)=>{
                reject(err);
            });
        });
    }

    public async publishAppIdentity(didSession: DIDSession, nativeRedirectUrl: string, nativeCallbackUrl: string, nativeCustomScheme: string): Promise<void> {
        let developerDID = await (await this.didSessions.getSignedInIdentity()).didString;
        await didSession.updateDIDDocument(developerDID, nativeRedirectUrl, nativeCallbackUrl, nativeCustomScheme);
        await didSession.publishDIDDocument();
    }
}
