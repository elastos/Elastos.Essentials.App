import { HttpClient } from "@angular/common/http";
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
      // Prepare our web3 provider bridge for injection
      let code = await httpClient.get('assets/essentialsiabprovider.js', {responseType: 'text'}).toPromise();

      // Get the active wallet address
      let subwallet = WalletManager.instance.getActiveMasterWallet().getSubWallet(StandardCoinName.ETHSC);
      dappBrowser.userAddress = await subwallet.createAddress();

      void dappBrowser.browser.executeScript({
        code: code + "\
          console.log('Elastos Essentials Web3 provider is being created'); \
          window.ethereum = new InAppBrowserWeb3Provider();\
          window.web3 = { \
            currentProvider: window.ethereum\
          };\
          console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3); \
          \
          window.ethereum.setChainId(20); \
          window.ethereum.setAddress('"+dappBrowser.userAddress+"');\
        "});

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
      case "signTransaction":
        this.browser.hide(); // TODO: FIND SOMETHING BETTER LATER
        await this.handleSignTransaction(message);
        this.browser.show(); // TODO: FIND SOMETHING BETTER LATER
        break;
      case "requestAccounts":
        // NOTE: for now, directly return user accounts without asking for permission
        await this.handleRequestAccounts(message);
        break;
      default:
        Logger.warn("dappbrowser", "Unhandle message command", message.data.name);
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

    this.sendIABResponse(
      message.data.id,
      response.result.txid // 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available.
    );
  }

  /**
   * Returns the active user address to the calling dApp.
   */
  private handleRequestAccounts(message: IABMessage): Promise<void> {
    this.sendIABResponse(
      message.data.id,
      [this.userAddress]
    );
    return;
  }

  /**
   * Sends a request response from Essentials to the callign web app.
   */
  private sendIABResponse(id: number, result: any) {
    let stringifiedResult = JSON.stringify(result);
    let code = 'window.ethereum.sendResponse('+id+', '+stringifiedResult+')';
    console.log("stringifiedResult", stringifiedResult, "code", code);

    void this.browser.executeScript({
      code: code
    });
  }
}