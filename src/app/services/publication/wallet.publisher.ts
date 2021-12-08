import { Logger } from "src/app/logger";
import { JSONObject } from "src/app/model/json";
import { ElastosApiUrlType, GlobalElastosAPIService } from "../global.elastosapi.service";
import { GlobalIntentService } from "../global.intent.service";
import { GlobalJsonRPCService } from "../global.jsonrpc.service";
import { DIDPublicationStatus, DIDPublishingManager } from "../global.publication.service";
import { GlobalSwitchNetworkService } from "../global.switchnetwork.service";
import { DIDPublisher } from "./didpublisher";

type EIDRPCRequest = {
  jsonrpc: "2.0",
  method: string,
  params: unknown[]
  id: number
};

type DIDResolveRequest = EIDRPCRequest & {
  method: "did_resolveDID",
  params: [{
    did: string,
    all?: boolean
  }]
};

type EIDChainResolveResponse = {
  did: string, // did:elastos:xxx
  status: 0,
  transaction: [
    {
      "txid": string,
      "timestamp": string, // ISO date
      // "operation": Unused
    }
  ]
}

/**
 * Scope: publish using the wallet
 */
export namespace WalletPublishing {
  export class WalletPublisher extends DIDPublisher {
    constructor(private manager: DIDPublishingManager,
      private jsonRPC: GlobalJsonRPCService,
      private globalIntentService: GlobalIntentService,
      private globalSwitchNetworkService: GlobalSwitchNetworkService) {
      super();
    }

    public init() {
    }

    public async publishDID(didString: string, payloadObject: JSONObject, memo: string, showBlockingLoader = false): Promise<void> {
      Logger.log("publicationservice", "Publishing DID with wallet:", payloadObject);

      // Make sure the active network is elastos, otherwise, ask user to change
      const elastosNetwork = await this.globalSwitchNetworkService.promptSwitchToElastosNetworkIfDifferent();
      if (!elastosNetwork) {
        return;// Used has denied to switch network. Can't continue.
      }

      let params = {
        didrequest: payloadObject
      }

      Logger.log('publicationservice', "Sending didtransaction intent with params:", params);

      try {
        this.manager.persistentInfo.did.didString = didString;
        this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.NO_ON_GOING_PUBLICATION;
        await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

        let response = await this.globalIntentService.sendIntent("https://wallet.elastos.net/didtransaction", params);

        Logger.log('publicationservice', "Got didtransaction intent response from the wallet.", response);

        // If txid is set in the response this means a transaction has been sent on chain.
        // If null, this means user has cancelled the operation (no ELA, etc).
        if (response.result && response.result.txid) {
          Logger.log('publicationservice', 'didtransaction response.result.txid ', response.result.txid);
          this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION;
          this.manager.persistentInfo.did.wallet = {
            txId: response.result.txid,
            publicationTime: Date.now() / 1000
          };
          await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);

          // Now we are going to wait for the transaction to be confirmed or rejected on chain. If
          // required, show a blocking loader duirng this time.
          if (showBlockingLoader) {
            await this.manager.displayPublicationLoader();
          }

          setTimeout(() => {
            void this.checkPublicationStatusAndUpdate();
          }, 1000);
        }
        else {
          Logger.log('publicationservice', 'didtransaction response.result.txid is null');
          this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
          await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
        }
      }
      catch (err) {
        Logger.error('publicationservice', "Failed to send app manager didtransaction intent!", err);
        this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
        await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
      }
    }

    private async checkPublicationStatusAndUpdate(): Promise<void> {
      // Stop checking status if not awaiting anything.
      if (this.manager.persistentInfo.did.publicationStatus !== DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION)
        return;

      // If time elapsed after publishing is too long, just stop checking and mark the publication as failed.
      const nowSec = Date.now() / 1000;
      const PUBLICATION_AWAIT_TIMEOUT_SEC = 50; // 50 seconds before considering this publication as errored
      if (nowSec - this.manager.persistentInfo.did.wallet.publicationTime > PUBLICATION_AWAIT_TIMEOUT_SEC) {
        Logger.log('publicationservice', "New DID can't be resolved after several seconds. Failing publication.");
        this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.FAILED_TO_PUBLISH;
        await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        Logger.log("publicationservice", "Checking transaction status on chain for txid " + this.manager.persistentInfo.did.wallet.txId);

        let request: DIDResolveRequest = {
          jsonrpc: "2.0",
          method: "did_resolveDID",
          params: [{
            did: this.manager.persistentInfo.did.didString,
            all: false
          }],
          id: 1
        };

        // Try to resolve the DID as the "key to successful publication". NOTE: we could instead listen to the
        // tx hash and tx receipt but that's a bit more complex for now, not necessary.
        let endpoint = await this.getEIDEndpoint();
        void this.jsonRPC.httpPost(endpoint, request).then(async (response: EIDChainResolveResponse) => {
          Logger.log("publicationservice", "EID chain successful resolve response:", response);
          if (response && response.transaction && response.transaction.length > 0) {
            Logger.log("publicationservice", "we got a clear status from the EID resolving RPC api.");

            if ("0x" + response.transaction[0].txid === this.manager.persistentInfo.did.wallet.txId) {
              Logger.log("publicationservice", "All good, we got the published txid in the resolved document (latest)");
              this.manager.persistentInfo.did.publicationStatus = DIDPublicationStatus.PUBLISHED_AND_CONFIRMED;
              await this.manager.savePersistentInfoAndEmitStatus(this.manager.persistentInfo);
              return;
            }
            else {
              Logger.log("publicationservice", "Txid is still the old one, we keep waiting.", response.transaction[0], this.manager.persistentInfo.did.wallet);
            }
          }
          else {
            Logger.log("publicationservice", "Unhandled or unchanged status");
          }

          setTimeout(() => {
            void this.checkPublicationStatusAndUpdate();
          }, 1000);
        });
      });
    }

    private getEIDEndpoint(): string {
      return GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.EID_RPC);
    }

    public resetStatus() {
    }
  }
}