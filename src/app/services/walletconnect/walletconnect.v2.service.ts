import { Injectable, NgZone } from '@angular/core';
import type WalletConnect from "@walletconnect/client";
import Client from '@walletconnect/sign-client';
import { SignClient } from '@walletconnect/sign-client/dist/types/client';
import { PairingTypes, ProposalTypes } from '@walletconnect/types';
import isUtf8 from "isutf8";
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { ConnectV2PageParams } from 'src/app/settings/pages/walletconnect/connectv2/connectv2.page';
import { Logger } from '../../logger';
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from '../../model/ethereum/requestparams';
import { JsonRpcRequest, SessionProposalEvent, SessionRequestEvent, WalletConnectSessionExtension } from '../../model/walletconnect/types';
import { EVMNetwork } from '../../wallet/model/networks/evms/evm.network';
import { EthSignIntentResult } from '../../wallet/pages/intents/ethsign/intentresult';
import { PersonalSignIntentResult } from '../../wallet/pages/intents/personalsign/intentresult';
import { SignTypedDataIntentResult } from '../../wallet/pages/intents/signtypeddata/intentresult';
import { EditCustomNetworkIntentResult } from '../../wallet/pages/settings/edit-custom-network/intentresult';
import { WalletNetworkService } from '../../wallet/services/network.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { GlobalFirebaseService } from '../global.firebase.service';
import { GlobalIntentService } from '../global.intent.service';
import { GlobalNativeService } from '../global.native.service';
import { GlobalNavService } from '../global.nav.service';
import { GlobalNetworksService } from '../global.networks.service';
import { GlobalPreferencesService } from '../global.preferences.service';
import { GlobalStorageService } from '../global.storage.service';
import { GlobalSwitchNetworkService } from '../global.switchnetwork.service';
import { GlobalTranslationService } from '../global.translation.service';
import { DIDSessionsStore } from '../stores/didsessions.store';
import { NetworkTemplateStore } from '../stores/networktemplate.store';
import { WalletConnectV2Instance } from './instances';
import { EIP155RequestHandler, EIP155ResultOrError } from './requesthandlers/eip155';
import { walletConnectStore } from './store';

export type EvaluatedMethod = {
  method: string;
  isSupported: boolean;
}

export type EvaluatedChain = {
  chain: string;
  isSupported: boolean;
}

type RelayerType = {
  value: string
  label: string
}

/**
 * Relayer Regions
 */
const REGIONALIZED_RELAYER_ENDPOINTS: RelayerType[] = [
  /* { // KO : subscribe methods not found - too old version?
    value: 'wss://walletconnect.elastos.net/v2',
    label: 'Essentials'
  }, */

  {
    value: 'wss://walletconnect.elastos.net/v3',
    label: 'Elastos 20221122'
  },

  /* {
    value: 'wss://relay.walletconnect.com',
    label: 'Default'
  },
  {
    value: 'wss://us-east-1.relay.walletconnect.com/',
    label: 'US'
  },
  {
    value: 'wss://eu-central-1.relay.walletconnect.com/',
    label: 'EU'
  },
  {
    value: 'wss://ap-southeast-1.relay.walletconnect.com/',
    label: 'Asia Pacific'
  } */
];

const supportedEIP155Methods = [
  // Tx
  "eth_sendTransaction",
  // Sign
  "eth_signTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  // Networks and tokens
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "wallet_watchAsset"
]

/**
 * Indicates from where a request to initiate a new WC session came from
 */
export enum WalletConnectSessionRequestSource {
  SCANNER, // User manually used the essentials scanner to scan a WC QR code
  EXTERNAL_INTENT // Probably a request from the connectivity SDK (mobile app, web app) that opens Essentials directly
}

export type ConnectorWithExtension = {
  wc: WalletConnect;
  sessionExtension: WalletConnectSessionExtension;
}

@Injectable({
  providedIn: 'root'
})
export class WalletConnectV2Service {
  public static instance: WalletConnectV2Service;

  private signClient: SignClient;

  private initiatingConnector: WalletConnect = null;

  // Subject updated with the whole list of active sessions every time there is a change.
  public walletConnectSessionsStatus = new BehaviorSubject<Map<string, ConnectorWithExtension>>(new Map());

  constructor(
    private zone: NgZone,
    private nav: GlobalNavService,
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private globalIntentService: GlobalIntentService,
    private globalNetworksService: GlobalNetworksService,
    private globalSwitchNetworkService: GlobalSwitchNetworkService,
    private walletNetworkService: WalletNetworkService,
    private walletManager: WalletService,
    private globalFirebaseService: GlobalFirebaseService,
    private native: GlobalNativeService
  ) {
    WalletConnectV2Service.instance = this;
  }

  public init(): Promise<void> {
    void this.createSignClient(REGIONALIZED_RELAYER_ENDPOINTS[0].value).then(async client => {
      this.signClient = client;
      await this.restoreSessions();
    }); // TODO: Auto detect best region?
    return;
  }

  private async restoreSessions() {
    // We don't need to actually restore session as this is done by WC automatically.
    // But we update our local store model.
    for (let pairing of this.signClient.core.pairing.getPairings()) {
      const sessionExtension = await walletConnectStore.loadSessionExtension(pairing.topic);
      const instance = new WalletConnectV2Instance(pairing, sessionExtension);
      walletConnectStore.add(instance);
    }
  }

  /**
   * Handles a scanned or received wc:// url in order to initiate a session with a wallet connect proxy
   * server and client.
   */
  public async handleWCURIRequest(uri: string, source: WalletConnectSessionRequestSource, receivedIntent?: EssentialsIntentPlugin.ReceivedIntent) {
    Logger.log("walletconnectv2", "Handling V2 uri request", uri, source);

    await this.signClient.pair({ uri });

    Logger.log("walletconnectv2", "Client is created:", this.signClient);

    await this.prepareClientForEvents();
  }

  private async createSignClient(relayUrl: string): Promise<Client> {
    let signClient = await Client.init({
      logger: 'debug',
      projectId: GlobalConfig.WallectConnect.PROJECT_ID,
      relayUrl,
      metadata: {
        description: "Essentials",
        url: "https://www.trinity-tech.io/essentials",
        icons: ["https://www.trinity-tech.io/images/apps/Essentials.svg"],
        name: "Essentials"
      }
    });

    Logger.log("walletconnectv2", "Created v2 client:", signClient);

    return signClient;
  }

  private prepareClientForEvents() {
    this.signClient.on("session_proposal", (event) => {
      // Show session proposal data to the user i.e. in a modal with options to approve / reject it

      Logger.log("walletconnectv2", "Receiving session proposal", event);

      void this.handleSessionProposal(event);
    });

    this.signClient.on("session_event", (event) => {
      // Handle session events, such as "chainChanged", "accountsChanged", etc.

      Logger.log("walletconnectv2", "Receiving session event", event);

      /*  interface Event {
         id: number;
         topic: string;
         params: {
           event: { name: string; data: any };
           chainId: string;
         };
       } */
    });

    this.signClient.on("session_request", (event) => {
      // Handle session method requests, such as "eth_sign", "eth_sendTransaction", etc.

      Logger.log("walletconnectv2", "Receiving session request", event);

      void this.handleSessionRequest(event);
    });

    this.signClient.on("session_ping", (event) => {
      // React to session ping event

      Logger.log("walletconnectv2", "Receiving session ping", event);

      /*  interface Event {
         id: number;
         topic: string;
       } */
    });

    this.signClient.on("session_delete", (event) => {
      // React to session delete event

      Logger.log("walletconnectv2", "Receiving session deletion", event);

      /* TODO if (this.shouldShowDisconnectionInfo(payload))
        this.native.genericToast("settings.wallet-connect-session-disconnected");

      this.initiatingConnector = null;
      this.connectors.delete(connector.key);
      this.walletConnectSessionsStatus.next(this.connectors);
      void this.deleteSession(connector.session); */

      /* interface Event {
        id: number;
        topic: string;
      } */
    });
  }

  private getAllTopics(): string[] {
    return this.signClient.core.pairing.getPairings().map(p => p.topic);
  }

  private getPairingByTopic(topic: string): PairingTypes.Struct {
    return this.signClient.core.pairing.getPairings().find(p => p.topic === topic);
  }

  public async killAllSessions(): Promise<void> {
    let topics = this.getAllTopics();
    Logger.log("walletconnectv2", "Killing " + topics.length + " v2 sessions.");

    for (let topic of topics) {
      await this.signClient.disconnect({
        topic,
        reason: {
          code: 1, message: "User disconnection"
        }
      });
    }

    Logger.log("walletconnectv2", "Killed all sessions");
  }

  /* payload sample:
  {
    "id": 1619053503716825,
    "jsonrpc": "2.0",
    "method": "session_request",
    "params": [
        {
            "peerId": "e810403d-f52e-49ab-8e19-d00c01cb22c9",
            "peerMeta": {
                "description": "",
                "url": "https://example.walletconnect.org",
                "icons": [
                    "https://example.walletconnect.org/favicon.ico"
                ],
                "name": "WalletConnect Example"
            },
            "chainId": null
        }
    ]
  }
  */
  private handleSessionProposal(event: SessionProposalEvent): Promise<void> {
    void this.zone.run(async () => {
      // Hide "prepare to connect" first
      await this.nav.exitCurrentContext(false);

      let params: ConnectV2PageParams = {
        // TODO connectorKey: connector.key,
        event
      }

      // User UI prompt
      await this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/connectv2", { state: params });
    });
    return;
  }

  private approveRequestWithResult(event: SessionRequestEvent, result: any) {
    return this.signClient.respond({
      topic: event.topic,
      response: {
        id: event.id,
        jsonrpc: "2.0",
        result
      }
    });
  }

  private rejectRequestWithError(event: SessionRequestEvent, errorCode: number, errorMessage: string) {
    return this.signClient.respond({
      topic: event.topic,
      response: {
        id: event.id,
        jsonrpc: "2.0",
        error: {
          code: errorCode,
          message: errorMessage
        }
      }
    });
  }

  private approveOrReject(event: SessionRequestEvent, resultOrError: EIP155ResultOrError<any>) {
    if (resultOrError.error) {
      return this.rejectRequestWithError(event, resultOrError.error.code, resultOrError.error.message);
    } else {
      return this.approveRequestWithResult(event, resultOrError.result);
    }
  }

  /* payload:
  {
    id: 1,
    jsonrpc: '2.0'.
    method: 'eth_sign',
    params: [
      "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
      "My email is john@doe.com - 1537836206101"
    ]
  }
  */
  private async handleSessionRequest(event: SessionRequestEvent) {
    // TODO: also handle the chain id from "event" in order to make sure the right network and wallets
    // are currently in use in the wallet, to avoid executing transactions on the wrong network

    let showReturnMessage = true;
    /* TODO if (request.method === "essentials_url_intent") {
      // Custom essentials request (not ethereum) over wallet connect protocol
      showReturnMessage = await this.handleEssentialsCustomRequest(connector, request);
    }
    else if (request.method === "wallet_watchAsset") {
      await this.handleAddERCTokenRequest(connector, request);
    }
    else */ if (event.params.request.method === "wallet_switchEthereumChain") {
      let resultOrError = await EIP155RequestHandler.handleSwitchNetworkRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    /* else if (request.method === "wallet_addEthereumChain") {
      await this.handleAddNetworkRequest(connector, request);
    }
    else if (request.method.startsWith("eth_signTypedData")) {
      await this.handleSignTypedDataRequest(connector, request);
    }
    else if (request.method.startsWith("personal_sign")) {
      await this.handlePersonalSignRequest(connector, request);
    }
    else if (request.method.startsWith("eth_sign")) {
      await this.handleEthSignRequest(connector, request);
    }
    else {
      try {
        Logger.log("walletconnectv2", "Sending esctransaction intent", request);
        let response: {
          action: string,
          result: {
            txid: string,
            status: "published" | "cancelled"
          }
        } = await this.globalIntentService.sendIntent("https://wallet.web3essentials.io/esctransaction", {
          payload: request
        });
        Logger.log("walletconnectv2", "Got esctransaction intent response", response);

        if (response && response.result.status === "published") {
          // Approve Call Request
          connector.approveRequest({
            id: request.id,
            result: response.result.txid
          });
        }
        else {
          // Reject Call Request
          connector.rejectRequest({
            id: request.id,
            error: {
              code: -1,
              message: "Errored or cancelled - TODO: improve this error handler"
            }
          });
        }
      }
      catch (e) {
        Logger.error("walletconnectv2", "Send intent error", e);
        // Reject Call Request
        connector.rejectRequest({
          id: request.id,
          error: {
            code: -1,
            message: e
          }
        });
      }
    }*/

    if (showReturnMessage) {
      // Because for now we don't close Essentials after handling wallet connect requests, we simply
      // inform users to manually "alt tab" to return to the app they are coming from.
      this.native.genericToast("settings.wallet-connect-popup", 2000);
    }
  }

  private async handleAddERCTokenRequest(connector: WalletConnect, request: JsonRpcRequest) {
    // Special EIP method used to add ERC20 tokens addresses to the wallet

    let params = request.params[0] instanceof Array ? request.params[0] : request.params;
    let response: {
      action: string,
      result: {
        added: boolean
      }
    } = await this.globalIntentService.sendIntent("https://wallet.web3essentials.io/adderctoken", params);

    if (response && response.result) {
      connector.approveRequest({
        id: request.id,
        result: response.result.added
      });
    }
    else {
      connector.rejectRequest({
        id: request.id,
        error: {
          code: -1,
          message: "Errored or cancelled"
        }
      });
    }
  }

  /**
   * Asks user to switch to another network as the client app needs it.
   *
   * EIP-3326
   *
   * If the error code (error.code) is 4902, then the requested chain has not been added
   * and you have to request to add it via wallet_addEthereumChain.
   */
  private async handleSwitchNetworkRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let switchParams: SwitchEthereumChainParameter = request.params[0];

    let chainId = parseInt(switchParams.chainId);

    let targetNetwork = this.walletNetworkService.getNetworkByChainId(chainId);
    if (!targetNetwork) {
      // We don't support this network
      this.native.errToast(GlobalTranslationService.instance.translateInstant("common.wc-not-supported-chainId", { chainId: switchParams.chainId }));
      connector.rejectRequest({
        id: request.id,
        error: {
          code: 4902,
          message: "Unsupported network"
        }
      });
      return;
    }
    else {
      // Do nothing if already on the right network
      let activeNetwork = this.walletNetworkService.activeNetwork.value;
      if ((activeNetwork instanceof EVMNetwork) && activeNetwork.getMainChainID() === chainId) {
        Logger.log("walletconnectv2", "Already on the right network");
        connector.approveRequest({
          id: request.id,
          result: {} // Successfully switched
        });
        return;
      }

      let networkSwitched = await this.globalSwitchNetworkService.promptSwitchToNetwork(targetNetwork);
      if (networkSwitched) {
        Logger.log("walletconnectv2", "Successfully switched to the new network");
        connector.approveRequest({
          id: request.id,
          result: {} // Successfully switched
        });
      }
      else {
        Logger.log("walletconnectv2", "Network switch cancelled");
        connector.rejectRequest({
          id: request.id,
          error: {
            code: -1,
            message: "Cancelled operation"
          }
        });
      }
    }
  }

  /**
   * Asks user to add a custom network.
   *
   * EIP-3085
   *
   * For the rpcUrls and blockExplorerUrls arrays, at least one element is required, and only the first element will be used.
   */
  private async handleAddNetworkRequest(connector: WalletConnect, request: JsonRpcRequest) {
    // Check if this network already exists or not.
    let addParams: AddEthereumChainParameter = request.params[0];
    let chainId = parseInt(addParams.chainId);

    let networkWasAdded = false;
    let addedNetworkKey: string;
    let existingNetwork = this.walletNetworkService.getNetworkByChainId(chainId);
    if (!existingNetwork) {
      // Network doesn't exist yet. Send an intent to the wallet and wait for the response.
      let response: EditCustomNetworkIntentResult = await this.globalIntentService.sendIntent("https://wallet.web3essentials.io/addethereumchain", addParams);

      if (response && response.networkAdded) {
        networkWasAdded = true;
        addedNetworkKey = response.networkKey;
      }
    }

    // Not on this network, ask user to switch
    let activeNetwork = this.walletNetworkService.activeNetwork.value;
    if (!(activeNetwork instanceof EVMNetwork) || activeNetwork.getMainChainID() !== chainId) {
      let targetNetwork = existingNetwork;
      if (!targetNetwork)
        targetNetwork = this.walletNetworkService.getNetworkByKey(addedNetworkKey);

      // Ask user to switch but we don't mind the result.
      await this.globalSwitchNetworkService.promptSwitchToNetwork(targetNetwork);
    }

    if (networkWasAdded || existingNetwork) {
      // Network added, or network already existed => success, no matter if user chosed to switch or not
      Logger.log("walletconnectv2", "Approving add network request");
      connector.approveRequest({
        id: request.id,
        result: {} // Successfully added or existing
      });
    }
    else {
      Logger.log("walletconnectv2", "Rejecting add network request");
      connector.rejectRequest({
        id: request.id,
        error: {
          code: 4001,
          message: "User rejected the request."
        }
      });
    }
  }

  private async handleSignTypedDataRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let useV4: boolean;
    switch (request.method) {
      case "eth_signTypedData_v3":
        useV4 = false;
        break;
      case "eth_signTypedData":
      case "eth_signTypedData_v4":
      default:
        useV4 = true;
        break;
    }

    let rawData: { payload: string, useV4: boolean } = {
      payload: request.params[1],
      useV4
    };
    let response: { result: SignTypedDataIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signtypeddata", rawData);

    if (response && response.result) {
      connector.approveRequest({
        id: request.id,
        result: response.result.signedData
      });
    }
    else {
      connector.rejectRequest({
        id: request.id,
        error: {
          code: -1,
          message: "Errored or cancelled"
        }
      });
    }
  }

  private async handlePersonalSignRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let data = request.params[0];
    let account = request.params[1]; // TODO: for now we use the active account... not the requested one (could possibly be another account)

    let rawData = {
      data
    };
    let response: { result: PersonalSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/personalsign", rawData);

    if (response && response.result) {
      connector.approveRequest({
        id: request.id,
        result: response.result.signedData
      });
    }
    else {
      connector.rejectRequest({
        id: request.id,
        error: {
          code: -1,
          message: "Errored or cancelled"
        }
      });
    }
  }

  /**
   * Legacy eth_sign. Can receive either a raw hex buffer (unsafe), or a prefixed utf8 string (safe)
   */
  private async handleEthSignRequest(connector: WalletConnect, request: JsonRpcRequest) {
    const buffer = this.messageToBuffer(request.params[1]);
    const hex = this.bufferToHex(buffer);

    /**
     * Historically eth_sign can either receive:
     * - a very insecure raw message (hex) - supported by metamask
     * - a prefixed message (utf8) - standardized implementation
     *
     * So we detect the format here:
     * - if that's a utf8 prefixed string -> eth_sign = personal_sign
     * - if that's a buffer (insecure hex that could sign any transaction) -> insecure eth_sign screen
     */
    if (isUtf8(buffer)) {
      return this.handlePersonalSignRequest(connector, request);
    } else {
      let rawData = {
        data: hex
      };
      let response: { result: EthSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/insecureethsign", rawData);

      if (response && response.result) {
        connector.approveRequest({
          id: request.id,
          result: response.result.signedData
        });
      }
      else {
        connector.rejectRequest({
          id: request.id,
          error: {
            code: -1,
            message: "Errored or cancelled"
          }
        });
      }
    }
  }

  // message: Bytes | string
  private messageToBuffer(message: string | any): Buffer {
    var buffer = Buffer.from([]);
    try {
      if ((typeof (message) === "string")) {
        buffer = Buffer.from(message.replace("0x", ""), "hex");
      } else {
        buffer = Buffer.from(message);
      }
    } catch (err) {
      console.log(`messageToBuffer error: ${err}`);
    }
    return buffer;
  }

  private bufferToHex(buf: Buffer): string {
    return "0x" + Buffer.from(buf).toString("hex");
  }

  /**
   * Handles custom essentials request coming from the wallet connect protocol.
   * method: "essentials_url_intent"
   * params: {url: "the essentials intent url" }
   *
   * @returns true is the "return to app" message should be shown to user, false otherwise
   */
  private async handleEssentialsCustomRequest(connector: WalletConnect, request: JsonRpcRequest): Promise<boolean> {
    let intentUrl = request.params[0]["url"] as string;
    try {
      Logger.log("walletconnectv2", "Sending custom essentials intent request", intentUrl);
      let response = await this.globalIntentService.sendUrlIntent(intentUrl);
      Logger.log("walletconnectv2", "Got custom request intent response. Approving WC request", response);

      // Approve Call Request
      connector.approveRequest({
        id: request.id,
        result: response
      });

      // Special case: "onboard" intent should not show a return message to user as it finishes instantly without response value,
      // but user should continue in Essetials after that.
      if (intentUrl.includes("/onboard"))
        return false;
      else
        return true;
    }
    catch (e) {
      Logger.error("walletconnectv2", "Send intent error", e);
      // Reject Call Request
      connector.rejectRequest({
        id: request.id,
        error: {
          code: -1,
          message: e
        }
      });

      // Let the user know that the request was received but could not be handled
      this.native.genericToast("settings.wallet-connect-error", 2000);

      if (await this.prefs.developerModeEnabled(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate))
        this.native.genericToast("settings.raw-request" + intentUrl, 2000);

      return false;
    }
  }

  /**
   * For each method given in input, returns its status, whether our wallet is able to
   * handle the method or not.
   * eg:
   * - eth_sendTransaction -> OK
   * - personal_sign -> KO
   */
  public evaluateMethods(proposal: ProposalTypes.Struct): EvaluatedMethod[] {
    let evaluatedMethods: EvaluatedMethod[] = [];

    // Only EVMs are supported for now. Later, handle solana, cosmos, etc.
    if (!("eip155" in proposal.requiredNamespaces))
      return [];

    for (let method of proposal.requiredNamespaces["eip155"].methods) {
      let evaluatedMethod: EvaluatedMethod = {
        method,
        isSupported: supportedEIP155Methods.includes(method)
      };
      evaluatedMethods.push(evaluatedMethod);
    }

    return evaluatedMethods;
  }

  /**
   * For each chain of all namespaces given in input, returns its status, whether our wallet is able to
   * handle the network or not.
   * eg:
   * - eip155:56 -> OK
   * - cosmos:xxx -> KO
   */
  public evaluateChains(proposal: ProposalTypes.Struct): EvaluatedChain[] {
    let evaluatedChains: EvaluatedChain[] = [];

    for (let namespace of Object.values(proposal.requiredNamespaces)) {
      for (let chain of namespace.chains) {
        let isSupported = this.isSupportedEVMChain(chain);
        let evaluatedChainId: EvaluatedChain = {
          chain,
          isSupported
        };
        evaluatedChains.push(evaluatedChainId);
      }
    }

    return evaluatedChains;
  }

  /**
   * @param chain "eip155:xxx"
   * @returns true if the chain id matches a network supported by our wallet, false otherwise.
   */
  private isSupportedEVMChain(chain: string): boolean {
    if (!chain.startsWith("eip155"))
      return false;

    // Parse the chain ID
    chain = chain.substring(7); // strip "eip155:"
    let chainId = parseInt(chain);

    let evmNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
    return !!evmNetwork;
  }

  public async acceptSessionRequest(proposal: ProposalTypes.Struct, ethAccountAddresses: string[]) {
    let activeNetwork = await this.walletNetworkService.activeNetwork.value;
    let chainId: number;

    chainId = activeNetwork instanceof EVMNetwork ? activeNetwork.getMainChainID() : 0;

    Logger.log("walletconnectv2", "Accepting session request with params:", proposal, ethAccountAddresses, chainId);

    // For each requested EIP155 chain (we have checked that we support them all), we return the EVM account address (same for all)
    let accounts: string[] = [];
    for (let chain of proposal.requiredNamespaces["eip155"].chains) {
      accounts.push(`${chain}:${ethAccountAddresses}`)
    }

    // Approve session proposal, use id from session proposal event and respond with namespace(s) that satisfy dapps request and contain approved accounts
    const { topic, acknowledged } = await this.signClient.approve({
      id: proposal.id,
      namespaces: { // Approved namespaces should match the request, based on our wallet capabilities
        eip155: {
          accounts,
          methods: proposal.requiredNamespaces["eip155"].methods, // We have checked that we can support the requested methods earlier, so we return everything that was required here.
          events: proposal.requiredNamespaces["eip155"].events,
          /* extension: [
            {
              accounts: ["eip:137"],
              methods: ["eth_sign"],
              events: [],
            },
          ], */
        },
      },
    });

    //console.log("Topic", topic);

    // Wait for dapp's response
    await acknowledged();

    //console.log("all pairings", this.signClient.core.pairing.getPairings());

    let sessionExtension: WalletConnectSessionExtension = {
      timestamp: moment().unix()
    }

    const pairing = this.getPairingByTopic(proposal.pairingTopic);
    const instance = new WalletConnectV2Instance(pairing, sessionExtension);
    walletConnectStore.add(instance);

    await walletConnectStore.saveSessionExtension(instance.id, sessionExtension);
  }

  public async rejectSession(proposal: ProposalTypes.Struct, reason: string) {
    Logger.log("walletconnectv2", "Rejecting session request", this.initiatingConnector);

    // Possibly, the session is rejected before getting proposal info. In this case we do nothing (TBC!)
    if (proposal) {
      // Reject session proposal
      await this.signClient.reject({
        id: proposal.id,
        reason: {
          code: 1,
          message: "rejected",
        },
      });
    }
  }

  public async killSession(instance: WalletConnectV2Instance) {
    await this.signClient.disconnect({
      topic: instance.id,
      reason: {
        code: 0,
        message: "User disconnection"
      }
    });

    await walletConnectStore.delete(instance);
  }
}