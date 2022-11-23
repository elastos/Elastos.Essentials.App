import { Injectable, NgZone } from '@angular/core';
import type WalletConnect from "@walletconnect/client";
import { parseUri } from '@walletconnect/utils';
import { Logger } from '../../logger';
import { IdentityEntry } from "../../model/didsessions/identityentry";
import { GlobalIntentService } from '../global.intent.service';
import { GlobalNavService } from '../global.nav.service';
import { GlobalService, GlobalServiceManager } from '../global.service.manager';
import { GlobalStorageService } from '../global.storage.service';
import { WalletConnectInstance } from './instances';
import { walletConnectStore } from './store';
import { WalletConnectV1Service } from './walletconnect.v1.service';
import { WalletConnectV2Service } from './walletconnect.v2.service';

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
  private initiatingConnector: WalletConnect = null;
  private onGoingRequestSource: WalletConnectSessionRequestSource = null;

  constructor(
    private zone: NgZone,
    private nav: GlobalNavService,
    private storage: GlobalStorageService,
    private globalIntentService: GlobalIntentService,
    private v1: WalletConnectV1Service,
    private v2: WalletConnectV2Service
  ) {
    super();
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    return;
  }

  public async onUserSignOut(): Promise<void> {
    await this.killAllSessions();
  }

  async init() {
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

    // Initialize v1 service
    await this.v1.init();

    // Initialize v2 service
    await this.v2.init();
  }

  public getRequestSource(): WalletConnectSessionRequestSource {
    return this.onGoingRequestSource;
  }

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

    // We support both WC v1 and 2. Detect which one is received here.
    const { version } = parseUri(uri);

    // While we are waiting to receive the "session_request" command, which could possibly take
    // between a few ms and a few seconds depending on the network, we want to show a temporary screen
    // to let the user wait.
    // TODO: PROBABLY REPLACE THIS WITH A CANCELLABLE DIALOG, FULL SCREEN IS UGLY
    this.zone.run(() => {
      void this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/preparetoconnect", {
        state: { version }
      });
    });

    try {
      if (version === 1) {
        await this.v1.handleWCURIRequest(uri, source, receivedIntent);
      }
      else if (version === 2) {
        await this.v2.handleWCURIRequest(uri, source, receivedIntent);
      }
      else {
        throw new Error(`Unsupported wallet connect version ${version}!`);
      }
    }
    catch (e) {
      Logger.error("WalletConnect initialization error: ", e);
    }
  }

  public async killSession(instance: WalletConnectInstance) {
    await instance.killSession();
  }

  public async killAllSessions(): Promise<void> {
    await this.v1.killAllSessions();
    await this.v2.killAllSessions();

    Logger.log("walletconnect", "Killed all sessions");
  }

  /* private async handlePersonalSignRequest(connector: WalletConnect, request: JsonRpcRequest) {
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
  } */

  public getActiveInstances(): WalletConnectInstance[] {
    return walletConnectStore.wcInstances.value;
  }
}