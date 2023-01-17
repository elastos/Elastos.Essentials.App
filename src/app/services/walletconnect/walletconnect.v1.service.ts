import { Injectable, NgZone } from '@angular/core';
import type WalletConnect from "@walletconnect/client";
import moment from 'moment';
import { Subscription } from 'rxjs';
import { lazyWalletConnectImport } from '../../helpers/import.helper';
import { runDelayed } from '../../helpers/sleep.helper';
import { Logger } from '../../logger';
import { IdentityEntry } from "../../model/didsessions/identityentry";
import { JsonRpcRequest, SessionRequestParams, WalletConnectSession, WalletConnectSessionExtension } from '../../model/walletconnect/types';
import { AnyNetworkWallet } from '../../wallet/model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from '../../wallet/model/networks/evms/evm.network';
import { WalletNetworkService } from '../../wallet/services/network.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { GlobalFirebaseService } from '../global.firebase.service';
import { GlobalIntentService } from '../global.intent.service';
import { GlobalNativeService } from '../global.native.service';
import { GlobalNavService } from '../global.nav.service';
import { GlobalPreferencesService } from '../global.preferences.service';
import { GlobalService, GlobalServiceManager } from '../global.service.manager';
import { GlobalStorageService } from '../global.storage.service';
import { GlobalSwitchNetworkService } from '../global.switchnetwork.service';
import { DIDSessionsStore } from '../stores/didsessions.store';
import { NetworkTemplateStore } from '../stores/networktemplate.store';
import { WalletConnectV1Instance } from './instances';
import { EIP155RequestHandler, EIP155ResultOrError } from './requesthandlers/eip155';
import { walletConnectStore } from './store';

/**
 * Indicates from where a request to initiate a new WC session came from
 */
export enum WalletConnectSessionRequestSource {
  SCANNER, // User manually used the essentials scanner to scan a WC QR code
  EXTERNAL_INTENT // Probably a request from the connectivity SDK (mobile app, web app) that opens Essentials directly
}

@Injectable({
  providedIn: 'root'
})
export class WalletConnectV1Service extends GlobalService {
  public static instance: WalletConnectV1Service;

  // Due to network or other reasons, users may initiate multiple wallet connection requests.
  private initiatingConnectors: WalletConnect[] = [];
  private activeWalletSubscription: Subscription = null;
  private onGoingRequestSource: WalletConnectSessionRequestSource = null;

  constructor(
    private zone: NgZone,
    private nav: GlobalNavService,
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private globalIntentService: GlobalIntentService,
    private globalSwitchNetworkService: GlobalSwitchNetworkService,
    private walletNetworkService: WalletNetworkService,
    private walletManager: WalletService,
    private globalFirebaseService: GlobalFirebaseService,
    private native: GlobalNativeService
  ) {
    super();
    WalletConnectV1Service.instance = this;
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);
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
        Logger.log("walletconnectv1", "Updating active connectors with new active wallet information", activeWallet);
        let instances = walletConnectStore.getV1Instances();
        for (let c of instances) {
          if (c.wc.connected) {
            try {
              let chainId = activeWallet.network instanceof EVMNetwork ? activeWallet.network.getMainChainID() : 0;
              let account = activeWallet.network instanceof EVMNetwork ? this.getAccountFromNetworkWallet(activeWallet) : null;
              Logger.log("walletconnectv1", `Updating connected session`, c, chainId, account);

              c.wc.updateSession({
                chainId: chainId,
                accounts: account ? [account] : []
              });
            }
            catch (e) {
              Logger.warn("walletconnectv1", "Non critical updateSession() error:", e);
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

  /**
   * Handles a scanned or received wc:// url in order to initiate a session with a wallet connect proxy
   * server and client.
   */
  public async handleWCURIRequest(uri: string, source: WalletConnectSessionRequestSource, receivedIntent?: EssentialsIntentPlugin.ReceivedIntent) {
    Logger.log("walletconnectv1", "Handling uri request", uri, source);

    // Create connector
    /* let pushServerOptions = undefined;
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
    } */

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
      // pushServerOptions // Failing to register the push server makes the whole WC connection fail, and we don't want this. Removing for now.
    );

    // Remember this connector for a while, for example to be able to reject the session request
    this.initiatingConnectors.push(connector);

    // TODO: wallet connect automatically reuses the persisted session from storage, if one was
    // established earlier. for debug purpose, we just always disconnect before reconnecting.
    /* if (this.connector.connected) {
      Logger.log("walletconnectv1", "DEBUG - Already connected, KILLING the session");
      await this.connector.killSession();
      Logger.log("walletconnectv1", "DEBUG - KILLED");
      Logger.log("walletconnectv1", "DEBUG - Reconnecting");
      await this.connector.connect();
      Logger.log("walletconnectv1", "DEBUG - Reconnected");
    } */

    Logger.log("walletconnectv1", "CONNECTOR", connector);

    this.prepareConnectorForEvents(connector);
  }

  private prepareConnectorForEvents(connector: WalletConnect) {
    // Subscribe to session requests events, when a client app wants to link with our wallet.
    connector.on("session_request", (error, payload) => {
      Logger.log("walletconnectv1", "Receiving session request", error, payload);

      if (error) {
        throw error;
      }

      void this.handleSessionRequest(connector, payload.params[0]);
    });

    // Subscribe to call requests
    connector.on("call_request", (error, payload) => {
      Logger.log("walletconnectv1", "Receiving call request", error, payload);

      if (error) {
        throw error;
      }

      void this.handleCallRequest(connector, payload);
    });

    connector.on("disconnect", (error, payload) => {
      Logger.log("walletconnectv1", "Receiving disconnection request", error, payload);

      if (error) {
        throw error;
      }

      if (this.shouldShowDisconnectionInfo(payload))
        this.native.genericToast("settings.wallet-connect-session-disconnected");

      let index = this.initiatingConnectors.findIndex(c => c.key == connector.key)
      if (index >= 0)
        this.initiatingConnectors.splice(index, 1)

      let instance = walletConnectStore.findById(connector.key);
      walletConnectStore.delete(instance);

      void this.deleteSession(connector.session);

    });
  }

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

  private approveRequestWithResult(connector: WalletConnect, requestId: number, result: any) {
    connector.approveRequest({
      id: requestId,
      result
    });
  }

  private rejectRequestWithError(connector: WalletConnect, requestId: number, errorCode: number, errorMessage: string) {
    connector.rejectRequest({
      id: requestId,
      error: {
        code: errorCode,
        message: errorMessage
      }
    });
  }

  private approveOrReject(connector: WalletConnect, requestId: number, resultOrError: EIP155ResultOrError<any>) {
    if (resultOrError.error) {
      this.rejectRequestWithError(connector, requestId, resultOrError.error.code, resultOrError.error.message);

    } else {
      this.approveRequestWithResult(connector, requestId, resultOrError.result);
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
  private async handleCallRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let showReturnMessage = true;
    if (request.method === "essentials_url_intent") {
      // Custom essentials request (not ethereum) over wallet connect protocol
      showReturnMessage = await this.handleEssentialsCustomRequest(connector, request);
    }
    else if (request.method === "wallet_watchAsset") {
      let resultOrError = await EIP155RequestHandler.handleAddERCTokenRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method === "wallet_switchEthereumChain") {
      let resultOrError = await EIP155RequestHandler.handleSwitchNetworkRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method === "wallet_addEthereumChain") {
      let resultOrError = await EIP155RequestHandler.handleAddNetworkRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method.startsWith("eth_signTypedData")) {
      let resultOrError = await EIP155RequestHandler.handleSignTypedDataRequest(request.method, request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method.startsWith("personal_sign")) {
      let resultOrError = await EIP155RequestHandler.handlePersonalSignRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method.startsWith("eth_sign")) {
      let resultOrError = await EIP155RequestHandler.handleEthSignRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }
    else if (request.method === "eth_sendTransaction") {
      let resultOrError = await EIP155RequestHandler.handleSendTransactionRequest(request.params);
      this.approveOrReject(connector, request.id, resultOrError);
    }

    if (showReturnMessage) {
      // Because for now we don't close Essentials after handling wallet connect requests, we simply
      // inform users to manually "alt tab" to return to the app they are coming from.
      this.native.genericToast("settings.wallet-connect-popup", 2000);
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
      Logger.log("walletconnectv1", "Sending custom essentials intent request", intentUrl);
      let response = await this.globalIntentService.sendUrlIntent(intentUrl);
      Logger.log("walletconnectv1", "Got custom request intent response. Approving WC request", response);

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
      Logger.error("walletconnectv1", "Send intent error", e);
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

    Logger.log("walletconnectv1", "Accepting session request with params:", connectorKey, ethAccountAddresses, chainId);

    // Approve Session
    let connector = null;
    let index = this.initiatingConnectors.findIndex(c => c.key === connectorKey);
    if (index != -1) {
        connector = this.initiatingConnectors[index];
        await connector.approveSession({
          accounts: ethAccountAddresses,
          chainId: chainId
        });

        let sessionExtension: WalletConnectSessionExtension = {
          timestamp: moment().unix()
        }

        const instance = new WalletConnectV1Instance(connector, sessionExtension);
        walletConnectStore.add(instance);

        await this.saveSession(connector.session);
        await walletConnectStore.saveSessionExtension(instance.id, sessionExtension);

        this.initiatingConnectors.splice(index, 1)
    }
  }

  public async rejectSession(connectorKey: string, reason: string) {
    Logger.log("walletconnectv1", "Rejecting session request", this.initiatingConnectors);

    let connector: WalletConnect = null;
    let isRejectInitiatingConnector = false;

    let index = 0;
    if (connectorKey)
        index = this.initiatingConnectors.findIndex(c => c.key === connectorKey);
    if (connectorKey && (index === -1)) {
      // We are rejecting a from a "session request" screen. The connector is already in our
      // connectors list and it's not a "initiatingconnector" any more.
      // We delete this connector from our list.
      let connectorWithInfo = this.findInstanceFromKey(connectorKey);
      if (connectorWithInfo)
        connector = connectorWithInfo.wc;

      Logger.log("walletconnectv1", "Rejecting session with connector key", connectorKey, connector);
    }
    else {
      connector = this.initiatingConnectors[index];
      isRejectInitiatingConnector = true;
    }

    // Reject Session
    if (connector) {
      // For some reasons sometimes the website shows a QR code but wallet thinks the connector is connected.
      // In this case we kill the session and restart.
      if (connector.connected) {
        try {
          Logger.log("walletconnectv1", "Killing session");
          await connector.killSession();
        }
        catch (e) {
          Logger.warn("walletconnectv1", "Reject session exception (disconnect):", e);
        }
      }
      else {
        try {
          Logger.log("walletconnectv1", "Rejecting session");
          connector.rejectSession({
            message: reason   // optional
          });
        }
        catch (e) {
          Logger.warn("walletconnectv1", "Reject session exception (reject):", e);
        }
      }

      /* this.connectors.delete(connectorKey);
      this.walletConnectSessionsStatus.next(this.connectors);
      void this.deleteSession(connector.session); */

      if (isRejectInitiatingConnector) this.initiatingConnectors.splice(index, 1)
    }
  }

  public async killSession(instance: WalletConnectV1Instance) {
    await instance.wc.killSession();
  }

  public async killAllSessions(): Promise<void> {
    let sessions = await this.loadSessions();

    const WalletConnect = await lazyWalletConnectImport();

    Logger.log("walletconnectv1", "Killing " + sessions.length + " sessions from persistent storage", sessions);
    // Kill stored connections
    for (let session of sessions) {
      let connector = new WalletConnect({
        session: session
      });
      try {
        await connector.killSession();

        let instance = walletConnectStore.findById(connector.key);
        if (instance)
          await walletConnectStore.delete(instance);
      }
      catch (e) {
        Logger.warn("walletconnectv1", "Error while killing WC session", connector, e);
      }
      await this.deleteSession(session);
    }

    Logger.log("walletconnectv1", "Killed all sessions");
  }

  private async restoreSessions() {
    let sessions = await this.loadSessions();

    const WalletConnect = await lazyWalletConnectImport();

    Logger.log("walletconnectv1", "Restoring " + sessions.length + " sessions from persistent storage", sessions);
    for (let session of sessions) {
      let connector = new WalletConnect({
        session: session
      });
      await this.prepareConnectorForEvents(connector);

      const sessionExtension = await walletConnectStore.loadSessionExtension(connector.key);
      const instance = new WalletConnectV1Instance(connector, sessionExtension);
      walletConnectStore.add(instance);
    }
    // TODO Logger.log("walletconnectv1", "Restored connectors:", this.connectors);

    // We are directly ready to receive requests after that, without any user intervention.
  }

  private findInstanceFromKey(connectorKey: string): WalletConnectV1Instance {
    return walletConnectStore.getV1Instances().find(i => i.id === connectorKey);
  }

  private async loadSessions(): Promise<WalletConnectSession[]> {
    Logger.log("walletconnectv1", "Loading storage sessions for user ", DIDSessionsStore.signedInDIDString);
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
}