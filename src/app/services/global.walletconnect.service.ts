import { Injectable, NgZone } from '@angular/core';
import type WalletConnect from "@walletconnect/client";
import isUtf8 from "isutf8";
import moment from 'moment';
import { BehaviorSubject, Subscription } from 'rxjs';
import { lazyWalletConnectImport } from '../helpers/import.helper';
import { runDelayed } from '../helpers/sleep.helper';
import { Logger } from '../logger';
import { IdentityEntry } from "../model/didsessions/identityentry";
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from '../model/ethereum/requestparams';
import { JsonRpcRequest, SessionRequestParams, WalletConnectSession, WalletConnectSessionExtension } from '../model/walletconnect/types';
import { AnyNetworkWallet } from '../wallet/model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from '../wallet/model/networks/evms/evm.network';
import { EthSignIntentResult } from '../wallet/pages/intents/ethsign/intentresult';
import { PersonalSignIntentResult } from '../wallet/pages/intents/personalsign/intentresult';
import { SignTypedDataIntentResult } from '../wallet/pages/intents/signtypeddata/intentresult';
import { EditCustomNetworkIntentResult } from '../wallet/pages/settings/edit-custom-network/intentresult';
import { WalletNetworkService } from '../wallet/services/network.service';
import { WalletService } from '../wallet/services/wallet.service';
import { GlobalFirebaseService } from './global.firebase.service';
import { GlobalIntentService } from './global.intent.service';
import { GlobalNativeService } from './global.native.service';
import { GlobalNavService } from './global.nav.service';
import { GlobalNetworksService } from './global.networks.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { GlobalSwitchNetworkService } from './global.switchnetwork.service';
import { GlobalTranslationService } from './global.translation.service';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';

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
export class GlobalWalletConnectService extends GlobalService {
  private connectors: Map<string, ConnectorWithExtension> = new Map(); // List of initialized WalletConnect instances.
  private initiatingConnector: WalletConnect = null;

  private activeWalletSubscription: Subscription = null;

  private onGoingRequestSource: WalletConnectSessionRequestSource = null;

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
    super();
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);

    Logger.log("walletconnect", "Registering to intent events");
    this.globalIntentService.intentListener.subscribe((receivedIntent) => {
      Logger.log("walletconnect", "Received intent event", receivedIntent);
      if (!receivedIntent)
        return;

      // Android receives the raw url.
      if (receivedIntent.action === "rawurl") {
        if (receivedIntent.params && receivedIntent.params.url) { // NOTE: urL
          // Make sure this raw url coming from outside is for us
          let rawUrl: string = receivedIntent.params.url;
          if (this.canHandleUri(rawUrl)) {
            if (!this.shouldIgnoreUri(rawUrl)) {
              this.zone.run(() => {
                void this.handleWCURIRequest(rawUrl, WalletConnectSessionRequestSource.EXTERNAL_INTENT, receivedIntent);
              });
            }
            else {
              // Send empty intent response to unlock the intent service
              void this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);
            }
          }
        }
        else {
          // Send empty intent response to unlock the intent service
          void this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);
        }
      }
      // iOS receives:
      // - https://essentials.elastos.net/wc?uri=wc:xxxx for real connections
      // - optionally, https://essentials.elastos.net/wc to just "reappear", like on android - should not be handled
      else if (receivedIntent.action === "https://essentials.elastos.net/wc" || receivedIntent.action === "https://essentials.web3essentials.io/wc") {
        if (receivedIntent.params && receivedIntent.params.uri) { // NOTE: urI
          // Make sure this raw url coming from outside is for us
          let rawUrl: string = receivedIntent.params.uri;
          if (this.canHandleUri(rawUrl)) {
            if (!this.shouldIgnoreUri(rawUrl)) {
              this.zone.run(() => {
                void this.handleWCURIRequest(rawUrl, WalletConnectSessionRequestSource.EXTERNAL_INTENT, receivedIntent);
              });
            }
            else {
              // Send empty intent response to unlock the intent service
              void this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);
            }
          }
        }
        else {
          // Send empty intent response to unlock the intent service
          void this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);
        }
      }
    });
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Re-activate existing sessions to reconnect to their wallet connect bridges.
    // IMPORTANT: Wait a moment before restoring sessions. We need to "make sure" (dirty for now)
    // that all intent listeners are registered otherwise the received request from WC would be lost,
    // if a WC request is pending (ex: essentials is starting from a WC intent or push notif).
    runDelayed(() => this.restoreSessions(), 5000);

    // NOTE: called when the network changes as well, as a new "network wallet" is created.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.activeWalletSubscription = this.walletManager.activeNetworkWallet.subscribe(activeWallet => {
      if (activeWallet) { // null value when essentials starts, while wallets are not yet initialized.
        Logger.log("walletconnect", "Updating active connectors with new active wallet information", activeWallet);
        for (let c of Array.from(this.connectors.values())) {
          if (c.wc.connected) {
            try {
              let chainId = activeWallet.network instanceof EVMNetwork ? activeWallet.network.getMainChainID() : 0;
              let account = activeWallet.network instanceof EVMNetwork ? this.getAccountFromNetworkWallet(activeWallet) : null;
              Logger.log("walletconnect", `Updating connected session`, c, chainId, account);

              c.wc.updateSession({
                chainId: chainId,
                accounts: account ? [account] : []
              });
            }
            catch (e) {
              Logger.warn("walletconnect", "Non critical updateSession() error:", e);
            }
          }
        }
      }
    });

    return;
  }

  /**
   * Returns the eth account address associated with the given master wallet.
   */
  private getAccountFromNetworkWallet(wallet: AnyNetworkWallet): string {
    return wallet.getMainEvmSubWallet().getCurrentReceiverAddress();
  }

  public async onUserSignOut(): Promise<void> {
    await this.killAllSessions();

    if (this.activeWalletSubscription) {
      this.activeWalletSubscription.unsubscribe();
    }
  }

  public getRequestSource(): WalletConnectSessionRequestSource {
    return this.onGoingRequestSource;
  }

  /* public async init(): Promise<void> {
    Logger.log("Intents", "Global intent service is initializing");
  } */

  public canHandleUri(uri: string): boolean {
    if (!uri || !uri.startsWith("wc:")) {
      //Logger.log("walletconnect", "DEBUG CANNOT HANDLE URI", uri);
      return false;
    }

    return true;
  }

  public shouldIgnoreUri(uri: string): boolean {
    // We should ignore urls even if starting with "wc:", if they don't contain params, according to wallet connect documentation
    // https://docs.walletconnect.org/mobile-linking
    if (uri.startsWith("wc:") && uri.indexOf("?") < 0)
      return true;

    return false;
  }

  /**
   * Handles a scanned or received wc:// url in order to initiate a session with a wallet connect proxy
   * server and client.
   */
  public async handleWCURIRequest(uri: string, source: WalletConnectSessionRequestSource, receivedIntent?: EssentialsIntentPlugin.ReceivedIntent) {
    // No one may be awaiting this response but we need to send the intent response to release the
    // global intent manager queue.
    if (receivedIntent)
      await this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);

    if (!this.canHandleUri(uri))
      throw new Error("Invalid WalletConnect URL: " + uri);

    Logger.log("walletconnect", "Handling uri request", uri, source);

    this.onGoingRequestSource = source;

    // While we are waiting to receive the "session_request" command, which could possibly take
    // between a few ms and a few seconds depending on the network, we want to show a temporary screen
    // to let the user wait.
    // TODO: PROBABLY REPLACE THIS WITH A CANCELLABLE DIALOG, FULL SCREEN IS UGLY
    this.zone.run(() => {
      void this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/preparetoconnect", {});
    });

    // Create connector
    let pushServerOptions = undefined;
    if (this.globalFirebaseService.token.value) {
      pushServerOptions = {
        // Optional
        url: "https://walletconnect-push.elastos.net/v2",
        //url: "http://192.168.31.113:5002",
        type: "fcm",
        token: this.globalFirebaseService.token.value,
        peerMeta: true,
        language: "en",
      };
    }

    const WalletConnect = await lazyWalletConnectImport();
    let connector = new WalletConnect(
      {
        uri: uri,
        storageId: "" + Math.random(), // Using a different storage ID for every sessions seems to be necessary to deal with cache/multi-sessions issues
        clientMeta: {
          description: "Essentials",
          url: "https://www.trinity-tech.io/essentials",
          icons: ["https://www.trinity-tech.io/images/apps/Essentials.svg"],
          name: "Essentials",
        },
      },
      /*
      About the push messages flow:
      - When essentials gets an incoming request from a WC client, it creates a connector with the
      push server info + user token info.
      - This info is sent to the bridge, and the bridge remembers those info for the current "topic" (on going session talk).
      - When the bridge receives a message request from the client for a topic, it calls our WC push
      server API and that push server sends the Firebase push message to the user token previously registered.
      - This push message is catched by the user's device and this shows a user notification if essentials is
      not in foreground. User clicks the notification and Essentials is opened and handles the request.
      */
      pushServerOptions
    );

    // Remember this connector for a while, for example to be able to reject the session request
    this.initiatingConnector = connector;

    // TODO: wallet connect automatically reuses the persisted session from storage, if one waas
    // established earlier. for debug purpose, we just always disconnect before reconnecting.
    /* if (this.connector.connected) {
      Logger.log("walletconnect", "DEBUG - Already connected, KILLING the session");
      await this.connector.killSession();
      Logger.log("walletconnect", "DEBUG - KILLED");
      Logger.log("walletconnect", "DEBUG - Reconnecting");
      await this.connector.connect();
      Logger.log("walletconnect", "DEBUG - Reconnected");
    } */

    Logger.log("walletconnect", "CONNECTOR", connector);

    await this.prepareConnectorForEvents(connector);
    //this.startConnectionFailureWatchdog(uri, connector);
  }

  private async prepareConnectorForEvents(connector: WalletConnect) {
    let sessionExtension = await this.loadSessionExtension(connector.key);
    this.connectors.set(connector.key, { wc: connector, sessionExtension });
    this.walletConnectSessionsStatus.next(this.connectors);

    // TMP DEBUG - TRY TO UNDERSTAND IF WS ARE DISCONNECTED AFTER SOME TIME IN BACKGROUND
    /* setInterval(() => {
      Logger.log("walletconnect", "Connector status", connector.key, "connected?", connector.connected);
    }, 3000); */

    // Subscribe to session requests events, when a client app wants to link with our wallet.
    connector.on("session_request", (error, payload) => {
      Logger.log("walletconnect", "Receiving session request", error, payload);

      if (error) {
        throw error;
      }

      this.initiatingConnector = null;
      void this.handleSessionRequest(connector, payload.params[0]);
    });

    // Subscribe to call requests
    connector.on("call_request", (error, payload) => {
      Logger.log("walletconnect", "Receiving call request", error, payload);

      if (error) {
        throw error;
      }

      void this.handleCallRequest(connector, payload);
    });

    connector.on("disconnect", (error, payload) => {
      Logger.log("walletconnect", "Receiving disconnection request", error, payload);

      if (error) {
        throw error;
      }

      if (this.shouldShowDisconnectionInfo(payload))
        this.native.genericToast("settings.wallet-connect-session-disconnected");

      this.initiatingConnector = null;
      this.connectors.delete(connector.key);
      this.walletConnectSessionsStatus.next(this.connectors);
      void this.deleteSession(connector.session);
    });
  }

  /**
   * Starts a timer that checks if a connection cannot be established.
   * In such case, we try to automatically kill and delete all existing sessions, and we restart
   * a connection attempt.
   */
  /* private startConnectionFailureWatchdog(uri: string, connector: WalletConnect) {
    let connectionWatchdogTimer = setTimeout(async () => {
      if (!connector.connected) {
        Logger.log("walletconnect", "Watchdog - killing all stored sessions to see if this cleanup can help...");
        await this.killAllSessions();
      }
    }, 5000);
  } */

  /**
   * Method that filters some disconnection events to not show a "sessions disconnected" popup in some cases.
   */
  private shouldShowDisconnectionInfo(disconnectionPayload: { event: string, params: { message: string }[] }) {
    // Unhandled payload type - show the disconnection.
    if (!disconnectionPayload || !disconnectionPayload.params || disconnectionPayload.params.length == 0)
      return true;

    // Don't show any toast if we are scanning again.
    if (disconnectionPayload.params[0].message == "Scanning again")
      return false;

    // Don't show any toast if user closes the connection screen while not connected yet.
    if (disconnectionPayload.params[0].message == "Cancelled by user")
      return false;

    // All other cases. Show the disconnection.
    return true;
  }

  public async killAllSessions(): Promise<void> {
    let sessions = await this.loadSessions();

    const WalletConnect = await lazyWalletConnectImport();

    Logger.log("walletconnect", "Killing " + sessions.length + " sessions from persistent storage", sessions);
    // Kill stored connections
    for (let session of sessions) {
      let connector = new WalletConnect({
        session: session
      });
      try {
        await connector.killSession();
      }
      catch (e) {
        Logger.warn("walletconnect", "Error while killing WC session", connector, e);
      }
      await this.deleteSession(session);
    }

    this.connectors.clear();

    Logger.log("walletconnect", "Killed all sessions");
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
  private handleSessionRequest(connector: WalletConnect, request: SessionRequestParams): Promise<void> {
    void this.zone.run(async () => {
      // Hide "prepare to connect" first
      await this.nav.exitCurrentContext(false);
      // User UI prompt
      await this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/connect", {
        //connectorKey: connector.key,
        queryParams: {
          connectorKey: connector.key,
          request
        }
      });
    });
    return;
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
  private async handleCallRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let showReturnMessage = true;
    if (request.method === "essentials_url_intent") {
      // Custom essentials request (not ethereum) over wallet connect protocol
      showReturnMessage = await this.handleEssentialsCustomRequest(connector, request);
    }
    else if (request.method === "wallet_watchAsset") {
      await this.handleAddERCTokenRequest(connector, request);
    }
    else if (request.method === "wallet_switchEthereumChain") {
      await this.handleSwitchNetworkRequest(connector, request);
    }
    else if (request.method === "wallet_addEthereumChain") {
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
        Logger.log("walletconnect", "Sending esctransaction intent", request);
        let response: {
          action: string,
          result: {
            txid: string,
            status: "published" | "cancelled"
          }
        } = await this.globalIntentService.sendIntent("https://wallet.web3essentials.io/esctransaction", {
          payload: request
        });
        Logger.log("walletconnect", "Got esctransaction intent response", response);

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
        Logger.error("walletconnect", "Send intent error", e);
        // Reject Call Request
        connector.rejectRequest({
          id: request.id,
          error: {
            code: -1,
            message: e
          }
        });
      }
    }

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
        Logger.log("walletconnect", "Already on the right network");
        connector.approveRequest({
          id: request.id,
          result: {} // Successfully switched
        });
        return;
      }

      let networkSwitched = await this.globalSwitchNetworkService.promptSwitchToNetwork(targetNetwork);
      if (networkSwitched) {
        Logger.log("walletconnect", "Successfully switched to the new network");
        connector.approveRequest({
          id: request.id,
          result: {} // Successfully switched
        });
      }
      else {
        Logger.log("walletconnect", "Network switch cancelled");
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
      Logger.log("walletconnect", "Approving add network request");
      connector.approveRequest({
        id: request.id,
        result: {} // Successfully added or existing
      });
    }
    else {
      Logger.log("walletconnect", "Rejecting add network request");
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
      Logger.log("walletconnect", "Sending custom essentials intent request", intentUrl);
      let response = await this.globalIntentService.sendUrlIntent(intentUrl);
      Logger.log("walletconnect", "Got custom request intent response. Approving WC request", response);

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
      Logger.error("walletconnect", "Send intent error", e);
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

  public async acceptSessionRequest(connectorKey: string, ethAccountAddresses: string[]) {
    let activeNetwork = await this.walletNetworkService.activeNetwork.value;
    let chainId: number;

    chainId = activeNetwork instanceof EVMNetwork ? activeNetwork.getMainChainID() : 0;

    Logger.log("walletconnect", "Accepting session request with params:", connectorKey, ethAccountAddresses, chainId);

    let connector = this.findConnectorFromKey(connectorKey);

    // Approve Session
    await connector.wc.approveSession({
      accounts: ethAccountAddresses,
      chainId: chainId
    });

    // Append current time as session creation time.
    if (!connector.sessionExtension.timestamp) {
      connector.sessionExtension.timestamp = moment().unix();
      await this.saveSessionExtension(connector.wc.key, connector.sessionExtension);
    }

    await this.saveSession(connector.wc.session);
  }

  public async rejectSession(connectorKey: string, reason: string) {
    Logger.log("walletconnect", "Rejecting session request", this.initiatingConnector);

    let connector: WalletConnect = null;
    if (connectorKey) {
      // We are rejecting a from a "session request" screen. The connector is already in our
      // connectors list and it's not a "initiatingconnector" any more.
      // We delete this connector from our list.
      let connectorWithInfo = this.findConnectorFromKey(connectorKey);
      if (connectorWithInfo)
        connector = connectorWithInfo.wc;

      Logger.log("walletconnect", "Rejecting session with connector key", connectorKey, connector);
    }
    else {
      connector = this.initiatingConnector;
      this.initiatingConnector = null;
    }

    // Reject Session
    if (connector) {
      // For some reasons sometimes the website shows a QR code but wallet thinks the connector is connected.
      // In this case we kill the session and restart.
      if (connector.connected) {
        try {
          Logger.log("walletconnect", "Killing session");
          await connector.killSession();
        }
        catch (e) {
          Logger.warn("walletconnect", "Reject session exception (disconnect):", e);
        }
      }
      else {
        try {
          Logger.log("walletconnect", "Rejecting session");
          connector.rejectSession({
            message: reason   // optional
          });
        }
        catch (e) {
          Logger.warn("walletconnect", "Reject session exception (reject):", e);
        }
      }

      /* this.connectors.delete(connectorKey);
      this.walletConnectSessionsStatus.next(this.connectors);
      void this.deleteSession(connector.session); */
    }
  }

  public async killSession(connector: WalletConnect) {
    await connector.killSession();
  }

  public getActiveConnectors(): ConnectorWithExtension[] {
    return Array.from(this.connectors.values());
  }

  private async restoreSessions() {
    let sessions = await this.loadSessions();

    const WalletConnect = await lazyWalletConnectImport();

    Logger.log("walletconnect", "Restoring " + sessions.length + " sessions from persistent storage", sessions);
    for (let session of sessions) {
      let connector = new WalletConnect({
        session: session
      });
      await this.prepareConnectorForEvents(connector);
    }
    Logger.log("walletconnect", "Restored connectors:", this.connectors);

    // We are directly ready to receive requests after that, without any user intervention.
  }

  private findConnectorFromKey(connectorKey: string): ConnectorWithExtension {
    return this.connectors.get(connectorKey);
  }

  private async loadSessions(): Promise<WalletConnectSession[]> {
    Logger.log("walletconnect", "Loading storage sessions for user ", DIDSessionsStore.signedInDIDString);
    let sessions = await this.storage.getSetting<WalletConnectSession[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", "sessions", []);
    return sessions;
  }

  private async saveSession(session: WalletConnectSession) {
    let sessions = await this.loadSessions();

    // Replace session if existing, add if new.
    let existingSessionIndex = sessions.findIndex(s => s.key === session.key);
    if (existingSessionIndex < 0)
      sessions.push(session); // add new
    else
      sessions[existingSessionIndex] = session; // replace

    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", "sessions", sessions);
  }

  private async deleteSession(session: WalletConnectSession) {
    let sessions = await this.loadSessions();

    let existingSessionIndex = sessions.findIndex(s => s.key === session.key);
    if (existingSessionIndex >= 0)
      sessions.splice(existingSessionIndex, 1);

    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", "sessions", sessions);
  }

  private async loadSessionExtension(sessionKey: string): Promise<WalletConnectSessionExtension> {
    let storageKey = "session_extension_" + sessionKey;
    let extension = await this.storage.getSetting<WalletConnectSessionExtension>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", storageKey, {});
    return extension;
  }

  private async saveSessionExtension(sessionKey: string, extension: WalletConnectSessionExtension) {
    let storageKey = "session_extension_" + sessionKey;
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", storageKey, extension);
  }

  /**
   * From a wallet connect instance, returns the full session model including
   * essentials additional fields.
   */
  /* public getSessionWithExtendedInfo(wcSession: WalletConnect): WalletConnectSession {

  } */

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
}