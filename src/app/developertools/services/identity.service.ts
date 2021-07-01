import { Injectable } from '@angular/core';
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
            didManager.resolveDidDocument(appDID, true, (document)=>{
                resolve(document);
            }, (err)=>{
                reject(err);
            });
        });
    }

    public getDeveloperIdentityOnChain(developerDID: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve, reject)=>{
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
