import { Injectable, NgZone } from '@angular/core';
import type WalletConnect from "@walletconnect/client";
import type { SignClient } from '@walletconnect/sign-client/dist/types/client';
import type { PairingTypes, ProposalTypes, SessionTypes } from '@walletconnect/types';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { lazyWalletConnectSignClientImport } from 'src/app/helpers/import.helper';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { ConnectV2PageParams } from 'src/app/settings/pages/walletconnect/connectv2/connectv2.page';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { Logger } from '../../logger';
import { SessionProposalEvent, SessionRequestEvent, WalletConnectSessionExtension } from '../../model/walletconnect/types';
import { EVMNetwork } from '../../wallet/model/networks/evms/evm.network';
import { WalletNetworkService } from '../../wallet/services/network.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { GlobalFirebaseService } from '../global.firebase.service';
import { GlobalIntentService } from '../global.intent.service';
import { GlobalNativeService } from '../global.native.service';
import { GlobalNavService } from '../global.nav.service';
import { GlobalNetworksService } from '../global.networks.service';
import { GlobalPreferencesService } from '../global.preferences.service';
import { GlobalService, GlobalServiceManager } from '../global.service.manager';
import { GlobalStorageService } from '../global.storage.service';
import { GlobalSwitchNetworkService } from '../global.switchnetwork.service';
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
    value: 'wss://relay.walletconnect.org',
    label: 'WC fallback that works from china - linked to the .com relay'
  },

  /* {
    value: 'wss://walletconnect.elastos.net/v3',
    label: 'Elastos 20221122'
  }, */

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
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
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
export class WalletConnectV2Service implements GlobalService {
  public static instance: WalletConnectV2Service;

  private signClient: SignClient;
  private activeWalletSubscription: Subscription = null;

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
    GlobalServiceManager.getInstance().registerService(this);

    void this.createSignClient(REGIONALIZED_RELAYER_ENDPOINTS[0].value).then(async client => {
      this.signClient = client;

      if (this.signClient)
        await this.restoreSessions();
    });

    return;
  }


  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // NOTE: called when the network changes as well, as a new "network wallet" is created.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.activeWalletSubscription = this.walletManager.activeNetworkWallet.subscribe(activeWallet => {
      if (this.signClient && activeWallet) { // null value when essentials starts, while wallets are not yet initialized.
        void this.updateAllSessionsAfterWalletChange();
      }
    });
    return;
  }

  onUserSignOut(): Promise<void> {
    if (this.activeWalletSubscription) {
      this.activeWalletSubscription.unsubscribe();
      this.activeWalletSubscription = null;
    }
    return;
  }

  private async restoreSessions() {
    // We don't need to actually restore session as this is done by WC automatically.
    // But we update our local store model.
    for (let session of this.signClient.session.getAll()) {
      const sessionExtension = await walletConnectStore.loadSessionExtension(session.topic);
      const instance = new WalletConnectV2Instance(session, sessionExtension);
      Logger.log("walletconnectv2", "Restoring session instance", instance);
      walletConnectStore.add(instance);
    }
  }

  private async updateAllSessionsAfterWalletChange() {
    const activeWallet = this.walletManager.activeNetworkWallet.value;

    let subwallet = activeWallet.getMainEvmSubWallet();
    let ethAccounts: string[] = [];
    if (subwallet) // Can be null, if the active network is not EVM
      ethAccounts.push(await subwallet.getCurrentReceiverAddress());

    Logger.log("walletconnectv2", "Updating active connectors with new active wallet information", this.signClient, activeWallet);
    let sessions = this.signClient.session.getAll();
    for (let session of sessions) {
      try {
        let chainId = activeWallet.network instanceof EVMNetwork ? activeWallet.network.getMainChainID() : 0;
        let account = activeWallet.network instanceof EVMNetwork ? this.getAccountFromNetworkWallet(activeWallet) : null;
        Logger.log("walletconnectv2", `Updating connected session`, session, chainId, account);

        // TODO: for now we always send the same chains as what the dapp requested. Meaning that WC v2 doesn't care about the ACTIVE NETWORK,
        // it only cares about what the dapp asked. So it's possible to change the network in essentials for now, but this change will not
        // be reflected in apps ! Which may make us execute transactions on wrong chains.

        // Accounts and chains are provided to the "session", not to "pairings".
        void this.signClient.update({
          topic: session.topic,
          namespaces: await this.buildNamespaces(ethAccounts, session.requiredNamespaces, session.optionalNamespaces)
        });
      }
      catch (e) {
        Logger.warn("walletconnectv2", "Non critical updateSession() error:", e);
      }
    }
  }

  /**
 * Returns the eth account address associated with the given master wallet.
 */
  private getAccountFromNetworkWallet(wallet: AnyNetworkWallet): string {
    return wallet.getMainEvmSubWallet().getCurrentReceiverAddress();
  }

  /**
   * Handles a scanned or received wc:// url in order to initiate a session with a wallet connect proxy
   * server and client.
   */
  public async handleWCURIRequest(uri: string, source: WalletConnectSessionRequestSource, receivedIntent?: EssentialsIntentPlugin.ReceivedIntent) {
    Logger.log("walletconnectv2", "Handling V2 uri request", uri, source);

    await this.signClient.pair({ uri });

    Logger.log("walletconnectv2", "Client is created:", this.signClient);
  }

  private async createSignClient(relayUrl: string): Promise<SignClient> {
    const Client = await lazyWalletConnectSignClientImport();

    try {
      let signClient = await Client.init({
        logger: 'debug',
        projectId: GlobalConfig.WallectConnect.PROJECT_ID,
        relayUrl,
        metadata: {
          description: "Essentials",
          url: "https://d.web3essentials.io/",
          icons: ["https://download.elastos.io/app/elastos-essentials/Essentials.svg"],
          name: "Essentials"
        }
      });

      await this.prepareClientForEvents(signClient);

      Logger.log("walletconnectv2", "Created v2 client:", signClient);

      return signClient;
    }
    catch (e) {
      Logger.warn("walletconnectv2", "Failed to create client", e);
      return null;
    }
  }

  private prepareClientForEvents(client: SignClient) {
    client.on("session_proposal", (event) => {
      // Show session proposal data to the user i.e. in a modal with options to approve / reject it
      Logger.log("walletconnectv2", "Receiving session proposal", event);
      void this.handleSessionProposal(event);
    });

    client.on("session_event", (event) => {
      // Handle session events, such as "chainChanged", "accountsChanged", etc.
      // TODO
      Logger.log("walletconnectv2", "Receiving session event", event);
    });

    client.on("session_request", (event) => {
      // Handle session method requests, such as "eth_sign", "eth_sendTransaction", etc.
      Logger.log("walletconnectv2", "Receiving session request", event);
      void this.handleSessionRequest(event);
    });

    client.on("session_ping", (event) => {
      // React to session ping event
      Logger.log("walletconnectv2", "Receiving session ping", event);
    });

    client.on("session_delete", async event => {
      // React to session delete event
      Logger.log("walletconnectv2", "Receiving session deletion", event);

      // TOPIC = session topic here.
      // NOTE: After disconnecting from a dapp, the SESSION is disconnected, but the PAIRING remains
      if (event && event.topic) {
        let instanceToDelete = walletConnectStore.findById(event.topic);
        if ((instanceToDelete)) {
          await walletConnectStore.delete(instanceToDelete);
        }
      }
    });

  }

  private getAllTopics(): string[] {
    return this.signClient.core.pairing.getPairings().map(p => p.topic);
  }

  private getPairingByTopic(topic: string): PairingTypes.Struct {
    return this.signClient.core.pairing.getPairings().find(p => p.topic === topic);
  }

  public async killAllSessions(): Promise<void> {
    if (!this.signClient) {
      Logger.warn("walletconnectv2", "Client not initialized, unable to kill all sessions");
      return;
    }

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

  private handleSessionProposal(event: SessionProposalEvent): Promise<void> {
    void this.zone.run(async () => {
      // Hide "prepare to connect" first
      await this.nav.exitCurrentContext(false);

      let params: ConnectV2PageParams = { event };

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

  private async handleSessionRequest(event: SessionRequestEvent) {
    // TODO: also handle the chain id from "event" in order to make sure the right network and wallets
    // are currently in use in the wallet, to avoid executing transactions on the wrong network

    let showReturnMessage = true;
    /* TODO if (request.method === "essentials_url_intent") {
      // Custom essentials request (not ethereum) over wallet connect protocol
      showReturnMessage = await this.handleEssentialsCustomRequest(connector, request);
    }
    else*/  if (event.params.request.method === "wallet_watchAsset") {
      let resultOrError = await EIP155RequestHandler.handleAddERCTokenRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method === "wallet_switchEthereumChain") {
      let resultOrError = await EIP155RequestHandler.handleSwitchNetworkRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method === "wallet_addEthereumChain") {
      let resultOrError = await EIP155RequestHandler.handleAddNetworkRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method.startsWith("eth_signTypedData")) {
      let resultOrError = await EIP155RequestHandler.handleSignTypedDataRequest(event.params.request.method, event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method.startsWith("personal_sign")) {
      let resultOrError = await EIP155RequestHandler.handlePersonalSignRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method.startsWith("eth_sign")) {
      let resultOrError = await EIP155RequestHandler.handleEthSignRequest(event.params.request.params);
      void this.approveOrReject(event, resultOrError);
    }
    else if (event.params.request.method === "eth_sendTransaction") {
      let chainId = this.wcChainToEIP155Chain(event.params.chainId);
      let resultOrError = await EIP155RequestHandler.handleSendTransactionRequest(event.params.request.params, chainId);
      void this.approveOrReject(event, resultOrError);
    }

    if (showReturnMessage) {
      // Because for now we don't close Essentials after handling wallet connect requests, we simply
      // inform users to manually "alt tab" to return to the app they are coming from.
      this.native.genericToast("settings.wallet-connect-popup", 2000);
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
    Logger.log("walletconnectv2", "Accepting session request with params:", proposal, ethAccountAddresses);

    // Approve session proposal, use id from session proposal event and respond with namespace(s) that satisfy dapps request and contain approved accounts
    const { topic: sessionTopic, acknowledged } = await this.signClient.approve({
      id: proposal.id,
      namespaces: await this.buildNamespaces(ethAccountAddresses, proposal.requiredNamespaces, proposal.optionalNamespaces)
    });

    //console.log("Topic", topic);

    // Wait for dapp's response
    await acknowledged();

    //console.log("all pairings", this.signClient.core.pairing.getPairings());

    let session = this.signClient.session.get(sessionTopic);

    let sessionExtension: WalletConnectSessionExtension = {
      timestamp: moment().unix()
    }

    //const pairing = this.getPairingByTopic(proposal.pairingTopic);
    const instance = new WalletConnectV2Instance(session, sessionExtension);
    walletConnectStore.add(instance);

    await walletConnectStore.saveSessionExtension(instance.id, sessionExtension);
  }

  private async buildNamespaces(ethAccountAddresses: string[], requiredNamespaces: ProposalTypes.RequiredNamespaces, optionNamespaces: ProposalTypes.OptionalNamespaces = null): Promise<SessionTypes.Namespaces> {
    let activeNetwork = await this.walletNetworkService.activeNetwork.value;
    let chainId: number;

    chainId = activeNetwork instanceof EVMNetwork ? activeNetwork.getMainChainID() : 0;

    // For each requested EIP155 chain (we have checked that we support them all), we return the EVM account address (same for all)
    let accounts: string[] = [];
    for (let chain of requiredNamespaces["eip155"].chains) {
      accounts.push(`${chain}:${ethAccountAddresses}`)
    }

    let methods: string[] = [];
    let events: string[] = [];
    // We also need to add option namespaces, some optional methods may also be executed.
    // If we don't add option namespaces, the app may directly think that this wallet does not support this method, and does not sent the request.
    if (optionNamespaces && optionNamespaces["eip155"]) {
      for (let chain of optionNamespaces["eip155"].chains) {
        accounts.push(`${chain}:${ethAccountAddresses}`)
      }
      methods = requiredNamespaces["eip155"].methods.concat(optionNamespaces["eip155"].methods);
      events = requiredNamespaces["eip155"].events.concat(optionNamespaces["eip155"].events);
    } else {
      methods = requiredNamespaces["eip155"].methods;
      events = requiredNamespaces["eip155"].events;
    }

    let namespaces: SessionTypes.Namespaces = { // Approved namespaces should match the request, based on our wallet capabilities
      eip155: {
        accounts,
        methods: methods, // We have checked that we can support the requested methods earlier, so we return everything that was required here.
        events: events,
        /* extension: [
          {
            accounts: ["eip:137"],
            methods: ["eth_sign"],
            events: [],
          },
        ], */
      },
    };

    return namespaces;
  }

  public async rejectSession(proposal: ProposalTypes.Struct, reason: string) {
    Logger.log("walletconnectv2", "Rejecting session request", proposal, reason);

    // Possibly, the session is rejected before getting proposal info (if user cancels the "connecting" screen). In this case we do nothing (TBC!)
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

  /**
   * From "eip155:25" to 25
   */
  private wcChainToEIP155Chain(chain: string): number {
    if (!chain.startsWith("eip155"))
      throw new Error("Invalid EIP155 chain format: " + chain)

    // Parse the chain ID
    chain = chain.substring(7); // strip "eip155:"
    return parseInt(chain);
  }
}