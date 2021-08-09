import { HttpClient } from "@angular/common/http";
import { GetCredentialsQuery } from "@elastosfoundation/elastos-connectivity-sdk-cordova/typings/did";
import { InAppBrowser, InAppBrowserObject } from "@ionic-native/in-app-browser/ngx";
import { Logger } from "src/app/logger";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { StandardCoinName } from "src/app/wallet/model/Coin";
import { WalletManager } from "src/app/wallet/services/wallet.service";

type IABMessage = {
  type: "message";
  data: {
    id: number;
    name: string; // Command name
    object: any; // Usually, the ETH JSON RPC payload.
  }
}

export class DAppBrowser {
  private browser: InAppBrowserObject = null;
  private userAddress: string = null;

  /**
   * Opens a new browser to display the target url.
   *
   * @param url The dApp URL to show.
   * @param iab Instance of the InAppBrowser cordova plugin.
   */
  public static open(url: string, iab: InAppBrowser, httpClient: HttpClient): DAppBrowser {
    let dappBrowser = new DAppBrowser();

    dappBrowser.browser = iab.create(url, '_blank', {
      location: 'yes',
      toolbar: 'yes',
      toolbartranslucent: 'no',
      toolbarposition: 'top',
      footercolor: '#000000',
      enableViewportScale: "no",
      //clearcache: "yes",
      //cleardata: "yes",
      //clearsessioncache: "yes"
    });

    // eslint-disable-next-line
    dappBrowser.browser.on('loadstart').subscribe(async event => {
      // Prepare our web3 provider bridge and elastos connectors for injection
      Logger.log("dappbrowser", "Loading the IAB web3 provider");
      let web3ProviderCode = await httpClient.get('assets/essentialsiabweb3provider.js', { responseType: 'text' }).toPromise();
      Logger.log("dappbrowser", "Loading the IAB elastos connector");
      let elastosConnectorCode = await httpClient.get('assets/essentialsiabconnector.js', { responseType: 'text' }).toPromise();

      // Get the active wallet address
      let subwallet = WalletManager.instance.getActiveMasterWallet().getSubWallet(StandardCoinName.ETHSC);
      dappBrowser.userAddress = await subwallet.createAddress();

      // Inject the web3 provider
      Logger.log("dappbrowser", "Executing Web3 provider injection script");
      void dappBrowser.browser.executeScript({
        code: web3ProviderCode + "\
          console.log('Elastos Essentials Web3 provider is being created'); \
          window.ethereum = new InAppBrowserWeb3Provider();\
          window.web3 = { \
            currentProvider: window.ethereum\
          };\
          console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3); \
          \
          window.ethereum.setChainId(20); \
          window.ethereum.setAddress('"+ dappBrowser.userAddress + "');\
        "});

      // Inject the Elastos connectivity connector
      Logger.log("dappbrowser", "Executing Elastos connector injection script");
      void dappBrowser.browser.executeScript({
        code: elastosConnectorCode + "\
          console.log('Elastos Essentials in app browser connector is being created'); \
          window.elastos = new EssentialsIABConnector();\
          console.log('Elastos Essentials in app browser connector is injected', window.elastos); \
        "});

      Logger.log("dappbrowser", "Load start completed");

      // TODO: window.ethereum.setAddress() should maybe be called only when receiving a eth_requestAccounts request.
    });

    dappBrowser.browser.on('message').subscribe((dataFromIAB) => {
      Logger.log("dappbrowser", "Received message", dataFromIAB);

      void dappBrowser.handleIABMessage(dataFromIAB as IABMessage);
    });

    return dappBrowser;
  }

  /**
   * Handles Web3 requests received from a dApp through the injected web3 provider.
   */
  private async handleIABMessage(message: IABMessage) {
    if (message.type != "message") {
      Logger.warn("dappbrowser", "Received unknown message type", message.type);
      return;
    }

    switch (message.data.name) {
      // WEB3 PROVIDER
      case "signTransaction":
        this.browser.hide();
        await this.handleSignTransaction(message);
        this.browser.show();
        break;
      case "requestAccounts":
        // NOTE: for now, directly return user accounts without asking for permission
        await this.handleRequestAccounts(message);
        break;

      // ELASTOS CONNECTOR
      case "elastos_getCredentials":
        this.browser.hide();
        await this.handleElastosGetCredentials(message);
        this.browser.show();
        break;

      default:
        Logger.warn("dappbrowser", "Unhandled message command", message.data.name);
    }
  }

  /**
   * Executes a smart contract transaction then returns the result to the calling dApp.
   */
  private async handleSignTransaction(message: IABMessage): Promise<void> {
    let response: {
      action: string,
      result: {
        txid: string,
        status: "published" | "cancelled"
      }
    } = await GlobalIntentService.instance.sendIntent("https://wallet.elastos.net/esctransaction", {
      payload: {
        params: [
          message.data.object
        ]
      }
    });

    this.sendWeb3IABResponse(
      message.data.id,
      response.result.txid // 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available.
    );
  }

  /**
   * Returns the active user address to the calling dApp.
   */
  private handleRequestAccounts(message: IABMessage): Promise<void> {
    this.sendWeb3IABResponse(
      message.data.id,
      [this.userAddress]
    );
    return;
  }

  private async handleElastosGetCredentials(message: IABMessage): Promise<void> {
    try {
      let query = message.data.object as GetCredentialsQuery;

      let res: { result: { presentation: DIDPlugin.VerifiablePresentation } };
      res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/credaccess", query);

      if (!res || !res.result || !res.result.presentation) {
        console.warn("Missing presentation. The operation was maybe cancelled.");
        // TODO: SEND IAB ERROR
        return;
      }

      this.sendElastosConnectorIABResponse(
        message.data.id,
        res.result.presentation
      );
    }
    catch(e) {
      this.sendElastosConnectorIABError(message.data.id, e);
    }
  }

  /**
   * Sends a request response from Essentials to the calling web app (web3).
   */
  private sendWeb3IABResponse(id: number, result: any) {
    let stringifiedResult = JSON.stringify(result);
    let code = 'window.ethereum.sendResponse(' + id + ', ' + stringifiedResult + ')';
    console.log("stringifiedResult", stringifiedResult, "code", code);

    void this.browser.executeScript({
      code: code
    });
  }

  private sendElastosConnectorIABResponse(id :number, result: any) {
    let stringifiedResult = JSON.stringify(result);
    let code = 'window.elastos.sendResponse(' + id + ', ' + stringifiedResult + ')';
    console.log("stringifiedResult", stringifiedResult, "code", code);

    void this.browser.executeScript({
      code: code
    });
  }

  private sendElastosConnectorIABError(id: number, error: Error | string) {
    Logger.log("dappbrowser", "Sending elastos error", error);

    let stringifiedError = typeof error == "string" ? error : new String(error);
    let code = 'window.elastos.sendError(' + id + ', "' + stringifiedError + '")';
    console.log("stringifiedError", stringifiedError, "code", code);

    void this.browser.executeScript({
      code: code
    });
  }
}