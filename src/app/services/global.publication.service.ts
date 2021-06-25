import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { GlobalStorageService } from './global.storage.service';
import { DIDStore } from '../identity/model/didstore.model';
import { Logger } from '../logger';
import { BehaviorSubject, Subject } from 'rxjs';

declare let didManager: DIDPlugin.DIDManager;

const assistAPIEndpoint = "https://assist-restapi.tuum.tech/v2"; // Assist DID 2.0
//const assistAPIEndpoint = "https://wogbjv3ci3.execute-api.us-east-1.amazonaws.com/prod/v1"; // Assist V1 DID 1.0
const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

export const enum DIDPublicationStatus {
    NO_ON_GOING_PUBLICATION = 0, // Initial state just before a publication is sent.
    AWAITING_PUBLICATION_CONFIRMATION = 1,
    PUBLISHED_AND_CONFIRMED = 2, // Previously published transaction was published and confirmed on chain.
    FAILED_TO_PUBLISH = 3
}

type PersistentInfo = {
    did: {
        //storeId: string;
        //storePassword: string;
        didString: string;
        publicationStatus: DIDPublicationStatus,
        assistPublicationID: string // Unique publication ID returned by the assist API after a successful publication request. This is NOT a blockchain transaction ID.
        //progress: number,
        //progressDate: any
    },
}

type PublicationStatus = {
    didString: string;
    status: DIDPublicationStatus
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
    private persistentInfo: PersistentInfo = null;
    public publicationStatus: Subject<PublicationStatus> = null;

    constructor(
        private storage: GlobalStorageService,
        private http: HttpClient
    ) {}

    public async init(): Promise<void> {
        this.persistentInfo = await this.loadPersistentInfo();
        this.publicationStatus = new Subject<PublicationStatus>();
    }

    private createNewPersistentInfo(): PersistentInfo {
        return {
            did: {
                didString: null,
                publicationStatus: DIDPublicationStatus.NO_ON_GOING_PUBLICATION,
                assistPublicationID: null
            }
        }
    }

    /**
     * Directly publishes a payload previously generated in another part of the app.
     *
     * DOC FOR ASSIST API: https://github.com/tuum-tech/assist-restapi-backend#verify
     */
    public async publishDIDOnAssist(didString: string, payloadObject: any, memo: string): Promise<void> {
        Logger.log("publicationservice", "Requesting identity publication to Assist");

        if (typeof payloadObject === "string")
            throw new Error("Payload must be a JSON object, not a stringified JSON");

        this.persistentInfo.did.didString = didString;
        this.persistentInfo.did.publicationStatus = DIDPublicationStatus.NO_ON_GOING_PUBLICATION;
        await this.savePersistentInfo(this.persistentInfo);
        this.emitPublicationStatusChangeFromPersistentInfo();

        const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

        const requestBody = {
            "did": didString,
            "memo": memo || "",
            "requestFrom": "Elastos Essentials",
            "didRequest": payloadObject
        };

        Logger.log("publicationservice", "Assist API request body:", requestBody, JSON.stringify(requestBody));

        const headers = new HttpHeaders({
            "Content-Type": "application/json",
            "Authorization": assistAPIKey
        });

        try {
            let response: AssistCreateTxResponse = await this.http.post(assistAPIEndpoint + "/didtx/create", requestBody, {
                headers: headers
            }).toPromise() as AssistCreateTxResponse;

            Logger.log("publicationservice", "Assist successful response:", response);
            if (response && response.meta && response.meta.code == 200 && response.data.confirmation_id) {
                Logger.log("publicationservice", "All good, DID has been submitted. Now waiting.");

                this.persistentInfo.did.publicationStatus = DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION;
                this.persistentInfo.did.assistPublicationID = response.data.confirmation_id;
                await this.savePersistentInfo(this.persistentInfo);
                this.emitPublicationStatusChangeFromPersistentInfo();

                void this.checkPublicationStatusAndUpdate();

                return;
            } else {
                let error = "Successful response received from the assist API, but response can't be understood";
                throw error;
            }
        }
        catch (err) {
            Logger.error("publicationservice", "Assist publish api error:", err);
            this.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
            await this.savePersistentInfo(this.persistentInfo);
            this.emitPublicationStatusChangeFromPersistentInfo();
        }
    }

     /**
     * Checks the publication status on the assist API, for a previously saved ID.
     */
    private checkPublicationStatusAndUpdate(): Promise<void> {
        // Stop checking status if not awaiting anything.
        if (this.persistentInfo.did.publicationStatus !== DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION)
            return;

        return new Promise((resolve, reject) => {
            Logger.log("publicationservice", "Requesting identity publication status to Assist for confirmation ID " + this.persistentInfo.did.assistPublicationID);

            const headers = new HttpHeaders({
                "Content-Type": "application/json",
                "Authorization": assistAPIKey
            });

            this.http.get(assistAPIEndpoint + "/didtx/confirmation_id/" + this.persistentInfo.did.assistPublicationID, {
                headers: headers
            }).toPromise().then(async (response: AssistTransactionStatusResponse) => {
                Logger.log("publicationservice", "Assist successful response:", response);
                if (response && response.meta && response.meta.code == 200 && response.data.status) {
                    Logger.log("publicationservice", "All good, We got a clear status from the assist api:", response.data.status);

                    if (response.data.status == AssistTransactionStatus.PENDING || response.data.status == AssistTransactionStatus.PROCESSING) {
                        // Transaction is still pending, we do nothing, just wait and retry later.
                        //Logger.log("publicationservice", "Publication is still pending / processing / not confirmed.");
                    }
                    else if (response.data.status == AssistTransactionStatus.QUARANTINED) {
                        // Blocking issue. This publication was quarantined, there is "something wrong somewhere".
                        // So to make things more reliable, we just delete everything and restart the process
                        // from scratch.
                        Logger.log("publicationservice", "Publication request was quarantined! Deleting the identity and trying again.");
                        this.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
                        await this.savePersistentInfo(this.persistentInfo);
                    }
                    else if (response.data.status == AssistTransactionStatus.COMPLETED) {
                        this.persistentInfo.did.publicationStatus = DIDPublicationStatus.PUBLISHED_AND_CONFIRMED;
                        await this.savePersistentInfo(this.persistentInfo);
                    }
                    else {
                        Logger.error("publicationservice", "Unhandled transaction status received from assist:", response.data.status);
                        this.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
                        await this.savePersistentInfo(this.persistentInfo);
                    }

                    this.emitPublicationStatusChangeFromPersistentInfo();

                    setTimeout(() => {
                        void this.checkPublicationStatusAndUpdate();
                    }, 1000);

                    resolve();
                } else {
                    let error = "Successful response received from the assist API, but response can't be understood";
                    Logger.error("publicationservice", "Assist api call error:", error);

                    this.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
                    await this.savePersistentInfo(this.persistentInfo);
                    this.emitPublicationStatusChangeFromPersistentInfo();

                    resolve();
                }
            }).catch(async (err) => {
                Logger.error("publicationservice", "Assist api call error:", err);

                this.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
                await this.savePersistentInfo(this.persistentInfo);
                this.emitPublicationStatusChangeFromPersistentInfo();

                resolve();
            });
        });
    }

    /**
     * Emit a public publication status event that matches the current persistent info state.
     */
    private emitPublicationStatusChangeFromPersistentInfo() {
        this.publicationStatus.next({
            didString: this.persistentInfo.did.didString,
            status: this.persistentInfo.did.publicationStatus
        });
    }

    private async loadPersistentInfo(): Promise<PersistentInfo> {
        let infoAsString = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'publicationservice', "persistentInfo", null);
        if (!infoAsString)
            return this.createNewPersistentInfo();

        return JSON.parse(infoAsString);
    }

    private async savePersistentInfo(persistentInfo: PersistentInfo) {
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'publicationservice', "persistentInfo", JSON.stringify(persistentInfo));
    }

    public async resetStatus() {
        this.persistentInfo = this.createNewPersistentInfo();
        await this.savePersistentInfo(this.persistentInfo);
        this.emitPublicationStatusChangeFromPersistentInfo();
    }

    public async publishDIDFromStore(storeId: string, storePass: string, didString: string): Promise<void> {
        Logger.log("publicationservice", "Starting the DID publication process");

        const didStore = await this.openDidStore(storeId, (payload: string, memo: string) => {
            // Callback called by the DID SDK when trying to publish a DID.
            Logger.log("publicationservice", "Create ID transaction callback is being called", payload, memo);
            const payloadAsJson = JSON.parse(payload);
            void this.publishDIDOnAssist(didString, payloadAsJson, memo);
        });

        const localDIDDocument = await this.loadLocalDIDDocument(didStore, didString);

        // Start the publication flow
        localDIDDocument.publish(storePass, () => { }, (err) => {
            // Local "publish" process errored
            Logger.log("publicationservice", "Local DID Document publish(): error", err);
            throw err;
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
}
