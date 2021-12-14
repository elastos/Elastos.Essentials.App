import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { ModalController } from "@ionic/angular";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "../global.didsessions.service";
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "../global.networks.service";
import { DIDPublicationStatus, DIDPublishingManager } from "../global.publication.service";
import { GlobalStorageService } from "../global.storage.service";
import { GlobalThemeService } from "../global.theme.service";
import { DIDPublisher } from "./didpublisher";

const FAKE_ASSIST_PASSWORD = "fakeAssistPassword";

const assistAPIEndpoint = "https://assist-service.tuum.tech/v1";

const assistAPIKey = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

/**
 * Scope: publish using assist API
 */
export namespace AssistPublishing {
  type AssistBaseResponse = {
    meta: {
      code: number;
      message: string;
      network: "mainnet" | "testnet"
    }
  }

  type AssistCreateTxResponse = AssistBaseResponse & {
    data: {
      didTx: {
        confirmationId: string; // "61b04d9155d0dc17b41848de"
        status: string; // "Pending"
      }
    }
  }

  type AssistCreateUserResponse = AssistBaseResponse & {
  }

  type AssistCreateTokenResponse = AssistBaseResponse & {
    data: {
      message: string;
      token: string;
      user: {
        accountType: string; // "free"
        createdAt: string; // "2021-12-08T05:40:07.010Z"
        requests: {
          today: number; // 0,
          all: number; // 0,
          exhaustedQuota: number; // 0,
          totalQuota: number; // 1
        };
        updatedAt: string; // "2021-12-08T05:40:07.010Z"
        username: string; //"did:elastos:ih3pa2h2JDxbtLcDgg5VrakshQHnfDLLCs"
      }
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
      didTx: {
        createdAt: string; // "2021-12-08T06:53:30.454Z"
        confirmationId: string; // "61b04d9155d0dc17b41848de"
        status: AssistTransactionStatus; // "Pending"
        updatedAt: string; // "2021-12-08T06:53:30.454Z"
        did: string; // "ih3pa2h2JDxbtLcDgg5VrakshQHnfDLLCs"
        didRequest: any;
        memo: string;
        requestFrom: {
          username: string; // 'did:elastos:ih3pa2h2JDxbtLcDgg5VrakshQHnfDLLCs'
        },
        blockchainTxHash: string; // "0x57d9e0e8e05f13eee67f02cc2710ee7116cfdb97821535133ed8e7433f94ef32"
      }
    }
  }

  export class AssistPublisher extends DIDPublisher {
    constructor(
      private manager: DIDPublishingManager,
      private http: HttpClient,
      private theme: GlobalThemeService,
      private modalCtrl: ModalController,
      private globalStorageService: GlobalStorageService,
      private globalNetworksService: GlobalNetworksService) {
      super();
    }

    public async init(): Promise<void> {
    }

    /**
     * Directly publishes a payload previously generated in another part of the app.
     *
     * DOC FOR ASSIST API: https://github.com/tuum-tech/assist-restapi-backend#verify
     */
    public async publishDID(didString: string, payloadObject: any, memo: string, showBlockingLoader = false): Promise<void> {
      Logger.log("publicationservice", "Requesting identity publication to Assist", didString);

      if (typeof payloadObject === "string")
        throw new Error("Payload must be a JSON object, not a stringified JSON");

      if (showBlockingLoader) {
        await this.manager.displayPublicationLoader();
      }

      try {
        this.manager.persistentInfo.did.didString = didString;
        this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.NO_ON_GOING_PUBLICATION;
        await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

        let apiToken = await this.getOrCreateApiToken(didString);

        const requestBody = {
          network: await this.getNetwork(),
          memo: memo || "",
          didRequest: payloadObject
        };

        Logger.log("publicationservice", "Publishing DID through assist with body:", requestBody, JSON.stringify(requestBody));

        const headers = new HttpHeaders({
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`
        });

        let assistAPIEndpoint = this.getAssistEndpoint();
        let response: AssistCreateTxResponse = await this.http.post(assistAPIEndpoint + "/eidSidechain/publish/didTx", requestBody, {
          headers: headers
        }).toPromise() as AssistCreateTxResponse;

        Logger.log("publicationservice", "Assist successful response:", response);
        if (response && response.meta && response.meta.code == 200 && response.data.didTx.confirmationId) {
          Logger.log("publicationservice", "All good, DID has been submitted. Now waiting.");

          this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION;
          this.manager.persistentInfo.did.assist.publicationID = response.data.didTx.confirmationId;
          await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

          void this.checkPublicationStatusAndUpdate(apiToken);

          return;
        } else {
          let error = "Successful response received from the assist API, but response can't be understood";
          throw error;
        }
      }
      catch (err) {
        Logger.error("publicationservice", "Assist publish api error:", err);
        this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
        await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
      }
    }

    private async getOrCreateApiToken(didString: string, forceNewToken = false): Promise<string> {
      Logger.log("publicationservice", "Creating a new assist user if needed");

      // No existing token, or forced to created a new token: create a new user + token
      try {
        let assistAPIEndpoint = this.getAssistEndpoint();
        let userCreationResponse: AssistCreateUserResponse = await this.http.post(assistAPIEndpoint + "/users/register", {
          network: await this.getNetwork(),
          username: didString,
          password: FAKE_ASSIST_PASSWORD
        }).toPromise() as AssistCreateUserResponse;

        Logger.log("publicationservice", userCreationResponse);
      }
      catch (e) {
        if (e instanceof HttpErrorResponse) {
          if (e.error && e.error.error && e.error.error.indexOf("already exists another user") > 0) {
            // Continue - our user already existed, all good.
            Logger.log("publicationservice", "Assist user already exists. Continuing");
          }
          else {
            throw e;
          }
        }
        else {
          throw e;
        }
      }

      // No existing token, or forced to created a new token: create a new user + token
      Logger.log("publicationservice", "Getting assist user token");
      let userTokenResponse: AssistCreateTokenResponse = await this.http.post(assistAPIEndpoint + "/users/login", {
        network: await this.getNetwork(),
        username: didString,
        password: FAKE_ASSIST_PASSWORD
      }).toPromise() as AssistCreateTokenResponse;

      // Don't catch exception - forward

      Logger.log("publicationservice", "Assist API token generated for user.");

      return userTokenResponse.data.token;
    }

    private getAssistEndpoint(): string {
      return assistAPIEndpoint;
    }

    /**
     * Computes the right assist api network according to current active network in settings.
     */
    private async getNetwork(): Promise<string> {
      let activeNetworkTemplate: string = null;

      if (!GlobalDIDSessionsService.signedInDIDString) {
        // No active user? Use mainnet
        activeNetworkTemplate = MAINNET_TEMPLATE;
      }
      else {
        activeNetworkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
      }

      switch (activeNetworkTemplate) {
        case MAINNET_TEMPLATE:
          return "mainnet";
        case TESTNET_TEMPLATE:
          return "testnet";
        default:
          throw new Error("Assist service cannot be used to published on network " + activeNetworkTemplate);
      }
    }

    /**
    * Checks the publication status on the assist API, for a previously saved ID.
    */
    private checkPublicationStatusAndUpdate(apiToken: string): Promise<void> {
      // Stop checking status if not awaiting anything.
      if (this.manager.persistentInfo.did.publicationStatus !== DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION)
        return;

      // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        Logger.log("publicationservice", "Requesting identity publication status to Assist for confirmation ID " + this.manager.persistentInfo.did.assist.publicationID);

        const headers = new HttpHeaders({
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`
        });

        let network = await this.getNetwork();

        let assistAPIEndpoint = this.getAssistEndpoint();
        this.http.get(assistAPIEndpoint + `/eidSidechain/get/didTx/confirmationId/${this.manager.persistentInfo.did.assist.publicationID}?network=${network}`, {
          headers: headers
        }).toPromise().then(async (response: AssistTransactionStatusResponse) => {
          Logger.log("publicationservice", "Assist successful response:", response);
          if (response && response.meta && response.meta.code == 200 && response.data.didTx.status) {
            Logger.log("publicationservice", "All good, We got a clear status from the assist api:", response.data.didTx.status);

            if (response.data.didTx.status == AssistTransactionStatus.PENDING || response.data.didTx.status == AssistTransactionStatus.PROCESSING) {
              // Transaction is still pending, we do nothing, just wait and retry later.
              //Logger.log("publicationservice", "Publication is still pending / processing / not confirmed.");

              // Don't save or emit for now, this will be sent when we get another useful (completed/failed) event later.
              if (response.data.didTx.blockchainTxHash)
                this.manager.persistentInfo.did.assist.txId = response.data.didTx.blockchainTxHash;
            }
            else if (response.data.didTx.status == AssistTransactionStatus.QUARANTINED) {
              // Blocking issue. This publication was quarantined, there is "something wrong somewhere".
              // So to make things more reliable, we just delete everything and restart the process
              // from scratch.
              Logger.log("publicationservice", "Publication request was quarantined! Deleting the identity and trying again.");
              this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
              await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
            }
            else if (response.data.didTx.status == AssistTransactionStatus.COMPLETED) {
              this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.PUBLISHED_AND_CONFIRMED;
              await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
            }
            else {
              Logger.error("publicationservice", "Unhandled transaction status received from assist:", response.data.didTx.status);
              this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
              await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
            }

            setTimeout(() => {
              void this.checkPublicationStatusAndUpdate(apiToken);
            }, 1000);

            resolve();
          } else {
            let error = "Successful response received from the assist API, but response can't be understood";
            Logger.error("publicationservice", "Assist api call error:", error);

            this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
            await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

            resolve();
          }
        }).catch(async (err) => {
          Logger.error("publicationservice", "Assist api call error:", err);

          this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
          await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

          resolve();
        });
      });
    }

    public resetStatus() {
    }
  }
}