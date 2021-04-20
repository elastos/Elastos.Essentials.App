import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { GlobalStorageService } from './global.storage.service';
import { DIDStore } from '../identity/model/didstore.model';

declare let didManager: DIDPlugin.DIDManager;

const assistAPIEndpoint = "https://wogbjv3ci3.execute-api.us-east-1.amazonaws.com/prod";
const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

export const enum DIDPublicationStatus {
    PUBLICATION_NOT_REQUESTED = 0,
    AWAITING_PUBLICATION_CONFIRMATION = 1,
    PUBLISHED_AND_CONFIRMED = 2
}

export type PersistentInfo = {
    did: {
        storeId: string;
        storePassword: string;
        didString: string;
        publicationStatus: DIDPublicationStatus,
        assistPublicationID: string // Unique publication ID returned by the assist API after a successful publication request. This is NOT a blockchain transaction ID.
        progress: number,
        progressDate: any
    },
}

type AssistBaseResponse = {
    meta: {
        code: number,
        message: string
    }
}

type AssistCreateTxResponse = AssistBaseResponse & {
    data: {
        confirmation_id: string,
        service_count: number,
        duplicate: boolean
    }
}

enum AssistTransactionStatus {
    PENDING = "Pending",
    PROCESSING = "Processing",
    COMPLETED = "Completed",
    QUARANTINED = "Quarantined",
    ERROR = "Error"
}

type AssistTransactionStatusResponse = AssistBaseResponse & {
    data: {
        id: string, // Confirmation ID as requested
        did: string, // DID, without did:elastos prefix
        requestFrom: string, // App package id of the requester
        didRequest: any, // Unhandled for now
        status: AssistTransactionStatus,
        memo: string,
        extraInfo: any, // Unhandled for now
        blockchainTxId: string,
        blockchainTx: any,
        created: string, // Creation date, in no clear format for now
        modified: string // Modification (?) date, in no clear format for now
    }
}

@Injectable({
  providedIn: 'root'
})
export class GlobalPublicationService {
    public persistentInfo: PersistentInfo = null;
    public activeDidStore: DIDStore;

    constructor(
        private storage: GlobalStorageService,
        private http: HttpClient
    ) {
        this.init();
    }

    public async init() {
        let persistentInfoJsonStr = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'identity', "persistentInfo", null) as string;
        this.persistentInfo = (persistentInfoJsonStr ? JSON.parse(persistentInfoJsonStr) : this.createNewPersistentInfo());
        console.log("Persistent info:", this.persistentInfo);
    }

    public createNewPersistentInfo(): PersistentInfo {
        return {
            did: {
                storeId: this.activeDidStore.getId(),
                storePassword: null,
                didString: GlobalDIDSessionsService.signedInDIDString,
                publicationStatus: DIDPublicationStatus.PUBLICATION_NOT_REQUESTED,
                assistPublicationID: null,
                progress: 0,
                progressDate: null
            }
        }
    }

    public async publishIdentity(): Promise<void> {
        console.log("Starting the DID publication process");

        return new Promise(async (resolve, reject) => {
            try {

                const didStore = await this.openDidStore(this.persistentInfo.did.storeId, async (payload: string, memo: string) => {
                    // Callback called by the DID SDK when trying to publish a DID.
                    console.log("Create ID transaction callback is being called", payload, memo);
                    const payloadAsJson = JSON.parse(payload);
                    try {
                        await this.publishDIDOnAssist(this.persistentInfo.did.didString, payloadAsJson, memo);
                        resolve();
                    }
                    catch (err) {
                        reject(err);
                    }
                });

                const localDIDDocument = await this.loadLocalDIDDocument(didStore, this.persistentInfo.did.didString);

                // Start the publication flow
                localDIDDocument.publish(this.persistentInfo.did.storePassword, () => { }, (err) => {
                    // Local "publish" process errored
                    console.log("Local DID Document publish(): error", err);
                    reject(err);
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }

    private openDidStore(storeId: string, createIdTransactionCallback: DIDPlugin.OnCreateIdTransaction): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve) => {
            didManager.initDidStore(storeId, createIdTransactionCallback, (didstore) => {
                resolve(didstore);
            }, (err) => {
                resolve(null);
            });
        });
    }

    private loadLocalDIDDocument(didStore: DIDPlugin.DIDStore, didString: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve) => {
            didStore.loadDidDocument(didString, (didDocument) => {
                resolve(didDocument);
            }, (err) => {
                resolve(null);
            });
        });
    }

    // DOC FOR ASSIST API: https://github.com/tuum-tech/assist-restapi-backend#verify
    private publishDIDOnAssist(didString: string, payloadObject: any, memo: string) {
        return new Promise((resolve, reject) => {
            console.log("Requesting identity publication to Assist");

            const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

            const requestBody = {
                "did": didString,
                "memo": memo || "",
                "requestFrom": "org.elastos.trinity.dapp.myfirstidentity",
                "didRequest": payloadObject
            };

            console.log("Assist API request body:", requestBody);

            const headers = new HttpHeaders({
                "Content-Type": "application/json",
                "Authorization": assistAPIKey
            });

            this.http.post(assistAPIEndpoint + "/v1/didtx/create", requestBody, {
                headers: headers
            }).toPromise().then(async (response: AssistCreateTxResponse) => {
                console.log("Assist successful response:", response);
                if (response && response.meta && response.meta.code == 200 && response.data.confirmation_id) {
                    console.log("All good, DID has been submitted. Now waiting.");

                    this.persistentInfo.did.publicationStatus = DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION;
                    this.persistentInfo.did.assistPublicationID = response.data.confirmation_id;
                    await this.savePersistentInfo(this.persistentInfo);

                    resolve();
                } else {
                    let error = "Successful response received from the assist API, but response can't be understood";
                    reject(error);
                }
            }).catch((err) => {
                console.log("Assist api call error:", err);
                reject(err);
            });
        });
    }

     /**
     * Checks the publication status on the assist API, for a previously saved ID.
     */
    public async checkPublicationStatusAndUpdate(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("Requesting identity publication status to Assist for confirmation ID " + this.persistentInfo.did.assistPublicationID);

            const headers = new HttpHeaders({
                "Content-Type": "application/json",
                "Authorization": assistAPIKey
            });

            this.http.get(assistAPIEndpoint + "/v1/didtx/confirmation_id/" + this.persistentInfo.did.assistPublicationID, {
                headers: headers
            }).toPromise().then(async (response: AssistTransactionStatusResponse) => {
                console.log("Assist successful response:", response);
                if (response && response.meta && response.meta.code == 200 && response.data.status) {
                    console.log("All good, We got a clear status from the assist api:", response.data.status);

                    if (response.data.status == AssistTransactionStatus.PENDING || response.data.status == AssistTransactionStatus.PROCESSING) {
                        // Transaction is still pending, we do nothing, just wait and retry later.
                        console.log("Publication is still pending / processing / not confirmed.");
                    }
                    else if (response.data.status == AssistTransactionStatus.QUARANTINED) {
                        // Blocking issue. This publication was quarantined, there is "something wrong somewhere".
                        // So to make things more reliable, we just delete everything and restart the process
                        // from scratch.
                        console.log("Publication request was quarantined! Deleting the identity and trying again.");
                        await this.reset();
                    }
                    else if (response.data.status == AssistTransactionStatus.COMPLETED) {
                        this.persistentInfo.did.publicationStatus = DIDPublicationStatus.PUBLISHED_AND_CONFIRMED;
                        await this.savePersistentInfo(this.persistentInfo);
                    }
                    else {
                        console.error("Unhandled transaction status received from assist:", response.data.status);
                    }

                    resolve();
                } else {
                    let error = "Successful response received from the assist API, but response can't be understood";
                    reject(error);
                }
            }).catch((err) => {
                console.log("Assist api call error:", err);
                reject(err);
            });
        });
    }

    public async savePersistentInfo(persistentInfo: PersistentInfo) {
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'identity', "persistentInfo", JSON.stringify(persistentInfo));
    }

    public async reset() {
        await this.savePersistentInfo(this.createNewPersistentInfo());
    }
}
