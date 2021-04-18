import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from './global.didsessions.service';

declare let didManager: DIDPlugin.DIDManager;

const assistAPIEndpoint = "https://wogbjv3ci3.execute-api.us-east-1.amazonaws.com/prod";
const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

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

  constructor(
    private didSessionsService: GlobalDIDSessionsService
  ) { }

 /*  public async publishIdentity(): Promise<void> {
    console.log("Starting the DID publication process");

    return new Promise(async (resolve, reject) => {
        try {

            let didStore = await this.openDidStore(persistentInfo.did.storeId, async (payload: string, memo: string) => {
                // Callback called by the DID SDK when trying to publish a DID.
                console.log("Create ID transaction callback is being called", payload, memo);
                let payloadAsJson = JSON.parse(payload);
                try {
                    await this.publishDIDOnAssist(this.didSessionsService.signedInDIDString, payloadAsJson, memo);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            });

            let localDIDDocument = await this.loadLocalDIDDocument(didStore, persistentInfo.did.didString);

            // Hive support: we directly automatically select a random hive node and define it as a service in the
            // DID document, before we publish at first. Because we don't want to publish the DID 2 times.
            await this.addRandomHiveToDIDDocument(localDIDDocument, persistentInfo.did.storePassword);

            // Start the publication flow
            localDIDDocument.publish(persistentInfo.did.storePassword, () => { }, (err) => {
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
 */
  
}
