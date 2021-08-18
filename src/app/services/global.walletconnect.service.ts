import { Injectable, NgZone } from '@angular/core';
import { Logger } from '../logger';
import WalletConnect from "@walletconnect/client";
import { GlobalNavService } from './global.nav.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { JsonRpcRequest, SessionRequestParams, WalletConnectSession } from '../model/walletconnect/types';
import { GlobalIntentService } from './global.intent.service';
import { GlobalStorageService } from './global.storage.service';
import { GlobalNativeService } from './global.native.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from './global.networks.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { WalletManager } from '../wallet/services/wallet.service';
import { MasterWallet } from '../wallet/model/wallets/MasterWallet';
import { StandardCoinName } from '../wallet/model/Coin';
import { ETHChainSubWallet } from '../wallet/model/wallets/ETHChainSubWallet';
import { GlobalFirebaseService } from './global.firebase.service';
import { runDelayed } from '../helpers/sleep.helper';

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
export class GlobalWalletConnectService extends GlobalService {
  private connectors: Map<string, WalletConnect> = new Map(); // List of initialized WalletConnect instances.
  private initiatingConnector: WalletConnect = null;
  private activeWalletSubscription: Subscription = null;

  private onGoingRequestSource: WalletConnectSessionRequestSource = null;

  // Subject updated with the whole list of active sessions every time there is a change.
  public walletConnectSessionsStatus = new BehaviorSubject<Map<string, WalletConnect>>(new Map());

  constructor(
    private zone: NgZone,
    private nav: GlobalNavService,
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private intent: GlobalIntentService,
    private intents: GlobalIntentService,
    private globalNetworksService: GlobalNetworksService,
    private walletManager: WalletManager,
    private globalFirebaseService: GlobalFirebaseService,
    private native: GlobalNativeService
  ) {
    super();
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);

    this.intents.intentListener.subscribe((receivedIntent)=>{
      if (!receivedIntent)
        return;

      if (receivedIntent.action === "rawurl") {
        if (receivedIntent.params && receivedIntent.params.url) {
          // Make sure this raw url coming from outside is for us
          let rawUrl: string = receivedIntent.params.url;
          if (this.canHandleUri(rawUrl)) {
            this.zone.run(()=>{
              void this.handleWCURIRequest(rawUrl, WalletConnectSessionRequestSource.EXTERNAL_INTENT);
            });
          }
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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.activeWalletSubscription = this.walletManager.activeMasterWallet.subscribe(async activeWalletId => {
      if (activeWalletId) { // null value when essentials starts, while wallets are not yet initialized.
        Logger.log("walletconnect", "Updating active connectors with new active wallet information", activeWalletId);
        for (let c of Array.from(this.connectors.values())) {
          if (c.connected) {
            try {
              c.updateSession({
                chainId: c.chainId,
                accounts: [await this.getAccountFromMasterWallet(this.walletManager.getMasterWallet(activeWalletId))]
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
  private getAccountFromMasterWallet(wallet: MasterWallet): Promise<string> {
    let subwallet = wallet.getSubWallet(StandardCoinName.ETHSC) as ETHChainSubWallet; // TODO: ONLY ELASTOS ETH FOR NOW
    return subwallet.createAddress();
  }

  public async onUserSignOut(): Promise<void> {
    await this.killAllSessions();

    this.activeWalletSubscription.unsubscribe();
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

    // We should ignore urls even if starting with "wc:", if they don't contain params, according to wallet connect documentation
    // https://docs.walletconnect.org/mobile-linking
    if (uri.indexOf("?") < 0)
      return false;

    return true;
  }

  /**
   * Handles a scanned or received wc:// url in order to initiate a session with a wallet connect proxy
   * server and client.
   */
  public handleWCURIRequest(uri: string, source: WalletConnectSessionRequestSource) {
    if (!this.canHandleUri(uri))
      throw new Error("Invalid WalletConnect URL: "+uri);

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

    let connector = new WalletConnect(
      {
        uri: uri,
        storageId: ""+Math.random(), // Using a different storage ID for every sessions seems to be necessary to deal with cache/multi-sessions issues
        clientMeta: {
          description: "Elastos Essentials",
          url: "https://www.elastos.org",
          icons: ["https://www.elastos.org/assets/img/elastos_logo_white_2x.png"],
          name: "Elastos Essentials",
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

    this.prepareConnectorForEvents(connector);
    //this.startConnectionFailureWatchdog(uri, connector);
  }

  private prepareConnectorForEvents(connector: WalletConnect) {
    this.connectors.set(connector.key, connector);
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
  private shouldShowDisconnectionInfo(disconnectionPayload: {event: string, params: {message:string}[]}) {
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

    Logger.log("walletconnect", "Killing "+sessions.length+" sessions from persistent storage", sessions);
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
    void this.zone.run(async ()=>{
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
    if (request.method === "essentials_url_intent") {
      // Custom essentials request (not ethereum) over wallet connect protocol
      await this.handleEssentialsCustomRequest(connector, request);
    }
    else if (request.method === "wallet_watchAsset") {
      await this.handleAddERCTokenRequest(connector, request);
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
        } = await this.intent.sendIntent("https://wallet.elastos.net/esctransaction", {
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

    // Because for now we don't close Essentials after handling wallet connect requests, we simply
    // inform users to manually "alt tab" to return to the app they are coming from.
    this.native.genericToast("settings.wallet-connect-popup", 2000);
  }

  private async handleAddERCTokenRequest(connector: WalletConnect, request: JsonRpcRequest) {
    // Special EIP method used to add ERC20 tokens addresses to the wallet

    let params = request.params[0] instanceof Array ? request.params[0] : request.params;
    let response: {
      action: string,
      result: {
          added: boolean
      }
    } = await this.intent.sendIntent("https://wallet.elastos.net/adderctoken", params);

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
   * Handles custom essentials request coming from the wallet connect protocol.
   * method: "essentials_url_intent"
   * params: {url: "the essentials intent url" }
   */
  private async handleEssentialsCustomRequest(connector: WalletConnect, request: JsonRpcRequest) {
    let intentUrl = request.params[0]["url"] as string;
    try {
      Logger.log("walletconnect", "Sending custom essentials intent request", intentUrl);
      let response = await this.intent.sendUrlIntent(intentUrl);
      Logger.log("walletconnect", "Got custom request intent response", response);

      // Approve Call Request
      connector.approveRequest({
        id: request.id,
        result: response
      });
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

      if (await this.prefs.developerModeEnabled(GlobalDIDSessionsService.signedInDIDString))
        this.native.genericToast("settings.raw-request"+intentUrl, 2000);
    }
  }

  public async acceptSessionRequest(connectorKey: string, ethAccountAddresses: string[]) {
    let activeNetworkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
    let chainId: number;

    // TODO: We keep this for now but this is wrong. Later we should use the active wallet in the wallet
    // app, not the settings' "network template" (one template can have many wallets: elastos, heco, etc, therefore
    // different chain ids)
    switch (activeNetworkTemplate) {
      case MAINNET_TEMPLATE:
        chainId = 20; break;
      case TESTNET_TEMPLATE:
        chainId = 21; break;
      default:
        throw new Error("Network currently selected in settings is not supported with wallet connect yet (unknown chain id). To be improved.");
    }

    Logger.log("walletconnect", "Accepting session request with params:", connectorKey, ethAccountAddresses, chainId);

    let connector = this.findConnectorFromKey(connectorKey);

    // Approve Session
    await connector.approveSession({
      accounts: ethAccountAddresses,
      chainId: chainId
    });

    await this.saveSession(connector.session);
  }

  public async rejectSession(connectorKey: string, reason: string) {
    Logger.log("walletconnect", "Rejecting session request", this.initiatingConnector);

    let connector: WalletConnect = null;
    if (connectorKey) {
      // We are rejecting a from a "session request" screen. The connector is already in our
      // connectors list and it's not a "initiatingconnector" any more.
      // We delete this connector from our list.
      connector = this.findConnectorFromKey(connectorKey);
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

  public getActiveSessions(): WalletConnect[] {
    return Array.from(this.connectors.values());
  }

  private async restoreSessions() {
    let sessions = await this.loadSessions();

    Logger.log("walletconnect", "Restoring "+sessions.length+" sessions from persistent storage", sessions);
    for (let session of sessions) {
      let connector = new WalletConnect({
        session: session
      });
      this.prepareConnectorForEvents(connector);
    }
    Logger.log("walletconnect", "Restored connectors:", this.connectors);

    // We are directly ready to receive requests after that, without any user intervention.
  }

  private findConnectorFromKey(connectorKey: string): WalletConnect {
    return this.connectors.get(connectorKey);
  }

  private async loadSessions(): Promise<WalletConnectSession[]> {
    Logger.log("walletconnect", "Loading storage sessions for user ", GlobalDIDSessionsService.signedInDIDString);
    let sessions = await this.storage.getSetting<WalletConnectSession[]>(GlobalDIDSessionsService.signedInDIDString, "walletconnect", "sessions", []);
    return sessions;
  }

  private async saveSession(session: WalletConnectSession) {
    let sessions = await this.loadSessions();

    // Replace session if existing, add if new.
    let existingSessionIndex = sessions.findIndex(s=>s.key === session.key);
    if (existingSessionIndex < 0)
      sessions.push(session); // add new
    else
      sessions[existingSessionIndex] = session; // replace

    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "walletconnect", "sessions", sessions);
  }

  private async deleteSession(session: WalletConnectSession) {
    let sessions = await this.loadSessions();

    let existingSessionIndex = sessions.findIndex(s=>s.key === session.key);
    if (existingSessionIndex >= 0)
      sessions.splice(existingSessionIndex, 1);

    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "walletconnect", "sessions", sessions);
  }
}