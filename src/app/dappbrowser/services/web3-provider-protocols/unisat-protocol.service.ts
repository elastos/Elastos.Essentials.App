import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { BTCMainNetNetwork } from 'src/app/wallet/model/networks/btc/network/btc.mainnet.network';
import { AnyBTCNetworkWallet } from 'src/app/wallet/model/networks/btc/networkwallets/btc.networkwallet';
import {
  BrowserConnectionType,
  BrowserWalletConnectionsService
} from 'src/app/wallet/services/browser-wallet-connections.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { DABMessage, DappBrowserService } from '../dappbrowser.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

@Injectable({
  providedIn: 'root'
})
export class UnisatProtocolService {
  private userBTCAddress: string = null;
  private btcRpcUrl: string = null;
  private activeBTCWallet: AnyBTCNetworkWallet = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private walletNetworkService: WalletNetworkService,
    private browserWalletConnectionsService: BrowserWalletConnectionsService
  ) {}

  /**
   * Sends a successful response to the injected provider
   */
  private sendInjectedResponse(provider: string, id: number, result: any): void {
    const stringifiedResult = JSON.stringify(result);
    const code = `window.${provider}.sendResponse(${id}, ${stringifiedResult})`;
    Logger.log('unisatprotocol', `Sending ${provider} response:`, stringifiedResult);
    void dappBrowser.executeScript({ code });
  }

  /**
   * Sends an error response to the injected provider
   */
  private sendInjectedError(provider: string, id: number, error: string | { code: number; message: string }): void {
    const stringifiedError = JSON.stringify(error);
    const code = `window.${provider}.sendError(${id}, ${stringifiedError})`;
    Logger.log('unisatprotocol', `Sending ${provider} error:`, stringifiedError);
    void dappBrowser.executeScript({ code });
  }

  /**
   * Executes JavaScript code in the browser context
   */
  private executeScript(code: string): Promise<void> {
    return dappBrowser.executeScript({ code });
  }

  /**
   * Cleanup subscriptions
   */
  public removeSubscriptions(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  /**
   * Handles Unisat-specific messages from the dApp
   */
  async handleMessage(message: DABMessage): Promise<void> {
    if (!message.data.name.startsWith('unisat_')) {
      Logger.warn('unisatprotocol', 'Received non-unisat message', message.data.name);
      return;
    }

    Logger.log('unisatprotocol', 'Handling Unisat command:', message.data.name);

    switch (message.data.name) {
      case 'unisat_requestAccounts':
        await this.handleBitcoinRequestAccounts(message);
        break;
      case 'unisat_getAccounts':
        await this.handleBitcoinGetAccounts(message);
        break;
      case 'unisat_getPublicKey':
        await this.handleBitcoinGetPublicKey(message);
        break;
      case 'unisat_pushTx':
        await this.handleBitcoinPushTx(message);
        break;
      case 'unisat_sendBitcoin':
        await this.handleBitcoinSend(message);
        break;
      case 'unisat_signMessage':
        await this.handleBitcoinSignMessage(message);
        break;
      case 'unisat_signData':
        await this.handleBitcoinSignData(message);
        break;
      default:
        Logger.warn('unisatprotocol', 'Unhandled unisat message command', message.data.name);
    }
  }

  /**
   * Gets the JavaScript code to inject the Unisat provider into the webpage
   */
  getProviderInjectionCode(walletAddress: string, rpcUrl: string): string {
    this.userBTCAddress = walletAddress;
    this.btcRpcUrl = rpcUrl;

    return `
      const bitcoinProvider = new DappBrowserUnisatProvider('${rpcUrl}', '${walletAddress}');
      window.unisat = bitcoinProvider;
      window.okxwallet = {
          bitcoin: bitcoinProvider
      }
      console.log('Essentials Unisat/OKX providers are injected', bitcoinProvider);
    `;
  }

  /**
   * Gets the injection code for a specific URL, handling wallet connections and address extraction
   */
  async getInjectionCodeForUrl(url: string): Promise<string> {
    if (!url) {
      Logger.warn('unisatprotocol', 'No URL provided for injection code generation');
      return this.getProviderInjectionCode('', this.btcRpcUrl || '');
    }

    // Check for existing Bitcoin wallet connection for this dapp
    const btcWallet = await this.browserWalletConnectionsService.getConnectedWallet(url, BrowserConnectionType.BITCOIN);

    // Get address from connected wallet
    let btcAddress = '';

    if (btcWallet) {
      btcAddress = await this.getWalletBitcoinAddress(btcWallet.masterWallet);
    }

    // Get Bitcoin RPC URL
    const bitcoinNetwork = this.walletNetworkService.getNetworkByKey('btc');
    const btcRpcUrl = bitcoinNetwork?.getRPCUrl() || '';

    return this.getProviderInjectionCode(btcAddress, btcRpcUrl);
  }

  /**
   * Sets up subscriptions to Bitcoin wallet changes for the current dApp
   */
  setupSubscriptions(): void {
    // Subscribe to Bitcoin wallet changes for the current dApp
    const bitcoinWalletSub = this.browserWalletConnectionsService.activeDappBitcoinWallet.subscribe(bitcoinWallet => {
      this.activeBTCWallet = bitcoinWallet;
      if (bitcoinWallet) {
        Logger.log('unisatprotocol', 'Bitcoin wallet changed for active dApp:', bitcoinWallet.masterWallet.name);
        // Handle async operations without blocking the subscribe callback
        void (async () => {
          try {
            // Get the wallet address
            const walletAddress = await this.getWalletBitcoinAddress(bitcoinWallet.masterWallet);

            // Update local state
            this.userBTCAddress = walletAddress;
            Logger.log('unisatprotocol', 'Updated Bitcoin address:', this.userBTCAddress);

            // Update the injected provider so it emits accountsChanged
            await this.updateProviderWithWallet(this.getCurrentUrl(), walletAddress);
          } catch (error) {
            Logger.error('unisatprotocol', 'Error updating Bitcoin wallet address:', error);
            this.userBTCAddress = null;
          }
        })();
      } else {
        Logger.log('unisatprotocol', 'Bitcoin wallet disconnected for active dApp');
        this.userBTCAddress = null;
        // Notify the Bitcoin provider about the disconnection
        void this.executeScript(`
            if (window.unisat && window.unisat.setAddress) {
              window.unisat.setAddress('');
            }
            if (window.okxwallet && window.okxwallet.bitcoin && window.okxwallet.bitcoin.setAddress) {
              window.okxwallet.bitcoin.setAddress('');
            }
          `);
      }
    });

    this.subscriptions.push(bitcoinWalletSub);
  }

  /**
   * Updates the injected provider with a newly connected wallet
   */
  async updateProviderWithWallet(dappUrl: string, walletAddress: string): Promise<void> {
    if (!walletAddress) return;

    try {
      const updateScript = `
        if (window.unisat && window.unisat.setAddress) {
          window.unisat.setAddress('${walletAddress}');
        }
        if (window.okxwallet && window.okxwallet.bitcoin && window.okxwallet.bitcoin.setAddress) {
          window.okxwallet.bitcoin.setAddress('${walletAddress}');
        }
      `;

      await this.executeScript(updateScript);
      Logger.log('unisatprotocol', 'Updated unisat provider with address:', walletAddress);
    } catch (error) {
      Logger.error('unisatprotocol', 'Error updating unisat provider:', error);
    }
  }

  /**
   * Handle unisat requestAccounts - triggers wallet selection if no BTC wallet connected
   */
  private async handleBitcoinRequestAccounts(message: DABMessage): Promise<void> {
    const currentUrl = this.getCurrentUrl();
    Logger.log('unisatprotocol', 'handleBitcoinRequestAccounts called', { currentUrl, messageId: message.data.id });

    if (!currentUrl) {
      Logger.warn('unisatprotocol', 'No current URL available for bitcoin request accounts');
      this.sendInjectedError('unisat', message.data.id, {
        code: 4001,
        message: 'User rejected the request.'
      });
      return;
    }

    // Check if we already have a connected wallet for this dapp
    let btcWallet = await this.browserWalletConnectionsService.getConnectedWallet(
      currentUrl,
      BrowserConnectionType.BITCOIN
    );
    Logger.log('unisatprotocol', 'BTC wallet check result:', { hasWallet: !!btcWallet, walletId: btcWallet?.id });

    if (!btcWallet) {
      Logger.log('unisatprotocol', 'No connected BTC wallet found, triggering wallet selection');

      let useActiveWallet = true;

      // Hide the browser and prompt for wallet selection
      if (!useActiveWallet) dappBrowser.hide();

      try {
        // Ask user to pick a BTC wallet.
        const connectedMasterWallet = await this.browserWalletConnectionsService.connectWallet(
          currentUrl,
          BrowserConnectionType.BITCOIN,
          useActiveWallet
        );

        if (connectedMasterWallet) {
          // Get the network wallet from the master wallet.
          const bitcoinNetwork = this.getBitcoinNetwork();
          btcWallet = (await bitcoinNetwork.createNetworkWallet(connectedMasterWallet, false)) as AnyBTCNetworkWallet;
        }

        Logger.log('unisatprotocol', 'BTC wallet selection result:', {
          hasWallet: !!btcWallet,
          walletId: btcWallet?.id
        });

        if (btcWallet) {
          // Update the injected provider with the new wallet
          const address = await this.getWalletBitcoinAddress(btcWallet.masterWallet);
          await this.updateProviderWithWallet(currentUrl, address);
          Logger.log('unisatprotocol', 'Successfully connected BTC wallet for dapp:', currentUrl);
        } else {
          Logger.log('unisatprotocol', 'The wallet does not support BTC');
          this.sendInjectedError('unisat', message.data.id, {
            code: 4902,
            message: 'Not support BTC network. Please use a wallet that supports Bitcoin.'
          });
          if (!useActiveWallet) void dappBrowser.show();
          return;
        }
      } catch (error) {
        Logger.error('unisatprotocol', 'Error during BTC wallet selection:', error);
        this.sendInjectedError('unisat', message.data.id, {
          code: -32603,
          message: 'Internal error'
        });
        if (!useActiveWallet) void dappBrowser.show();
        return;
      }

      // Show the browser again
      if (!useActiveWallet) void dappBrowser.show();
    }

    // Return the connected wallet address
    if (btcWallet) {
      const address = await this.getWalletBitcoinAddress(btcWallet.masterWallet);
      Logger.log('unisatprotocol', 'Sending BTC address response:', { address, messageId: message.data.id });
      this.sendInjectedResponse('unisat', message.data.id, [address]);
    } else {
      Logger.log('unisatprotocol', 'No BTC wallet available, sending error');
      this.sendInjectedError('unisat', message.data.id, {
        code: 4001,
        message: 'User rejected the request.'
      });
    }
  }

  /**
   * Handle unisat getAccounts - returns connected BTC wallet address
   */
  private async handleBitcoinGetAccounts(message: DABMessage): Promise<void> {
    const currentUrl = this.getCurrentUrl();
    if (!currentUrl) {
      Logger.warn('unisatprotocol', 'No current URL available for bitcoin get accounts');
      this.sendInjectedError('unisat', message.data.id, {
        code: -32603,
        message: 'No current URL available'
      });
      return;
    }

    // Check if we have a connected wallet for this dapp
    const btcWallet = await this.browserWalletConnectionsService.getConnectedWallet(
      currentUrl,
      BrowserConnectionType.BITCOIN
    );

    if (btcWallet) {
      const address = await this.getWalletBitcoinAddress(btcWallet.masterWallet);
      this.sendInjectedResponse('unisat', message.data.id, [address]);
    } else {
      // Return empty array if no wallet connected
      this.sendInjectedResponse('unisat', message.data.id, []);
    }
  }

  private async handleBitcoinGetPublicKey(message: DABMessage): Promise<void> {
    try {
      const currentUrl = this.getCurrentUrl();
      if (!currentUrl) {
        throw new Error('No current URL available');
      }

      // Use dApp-specific Bitcoin wallet connection
      const bitcoinWallet = await this.browserWalletConnectionsService.getConnectedWallet(
        currentUrl,
        BrowserConnectionType.BITCOIN
      );

      if (!bitcoinWallet) {
        throw new Error('No Bitcoin wallet connected for this dApp');
      }

      const publickey = await this.getWalletBitcoinPublicKey(bitcoinWallet.masterWallet);
      this.sendInjectedResponse('unisat', message.data.id, publickey);
    } catch (e) {
      this.sendInjectedError('unisat', message.data.id, e);
    }
  }

  private async handleBitcoinPushTx(message: DABMessage): Promise<void> {
    try {
      if (!this.activeBTCWallet) {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'No Bitcoin wallet connected.'
        });
        return;
      }

      const response: {
        action: string;
        result: {
          txid: string;
          status: 'published' | 'cancelled';
        };
      } = await GlobalIntentService.instance.sendIntent('https://wallet.web3essentials.io/pushbitcointx', {
        masterWalletId: this.activeBTCWallet.masterWallet.id,
        payload: {
          params: [message.data.object]
        }
      });
      if (response.result.txid) {
        this.sendInjectedResponse('unisat', message.data.id, response.result.txid);
      } else {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'User rejected the request.'
        });
      }
    } catch (e) {
      this.sendInjectedError('unisat', message.data.id, e);
    }
  }

  private async handleBitcoinSend(message: DABMessage): Promise<void> {
    try {
      if (!this.activeBTCWallet) {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'No Bitcoin wallet connected.'
        });
        return;
      }

      console.log('unisatprotocol', 'handleBitcoinSend', this.activeBTCWallet.masterWallet);

      const response: {
        action: string;
        result: {
          txid: string;
          status: 'published' | 'cancelled';
        };
      } = await GlobalIntentService.instance.sendIntent('https://wallet.web3essentials.io/sendbitcoin', {
        masterWalletId: this.activeBTCWallet.masterWallet.id,
        payload: {
          params: [message.data.object]
        }
      });
      if (response.result.txid) {
        this.sendInjectedResponse('unisat', message.data.id, response.result.txid);
      } else {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'User rejected the request.'
        });
      }
    } catch (e) {
      this.sendInjectedError('unisat', message.data.id, e);
    }
  }

  private async handleBitcoinSignMessage(message: DABMessage): Promise<void> {
    try {
      if (!this.activeBTCWallet) {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'No Bitcoin wallet connected.'
        });
        return;
      }

      const responseSignMessage: {
        action: string;
        result: {
          signature: string;
        };
      } = await GlobalIntentService.instance.sendIntent('https://wallet.web3essentials.io/signbitcoinmessage', {
        masterWalletId: this.activeBTCWallet.masterWallet.id,
        payload: {
          params: [message.data.object]
        }
      });
      if (responseSignMessage.result.signature) {
        this.sendInjectedResponse('unisat', message.data.id, responseSignMessage.result.signature);
      } else {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'User rejected the request.'
        });
      }
    } catch (e) {
      this.sendInjectedError('unisat', message.data.id, e);
    }
  }

  private async handleBitcoinSignData(message: DABMessage): Promise<void> {
    try {
      if (!this.activeBTCWallet) {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'No Bitcoin wallet connected.'
        });
        return;
      }

      const responseSigndata: {
        action: string;
        result: {
          signature: string;
        };
      } = await GlobalIntentService.instance.sendIntent('https://wallet.web3essentials.io/signbitcoindata', {
        masterWalletId: this.activeBTCWallet.masterWallet.id,
        payload: {
          params: [message.data.object]
        }
      });
      if (responseSigndata.result.signature) {
        this.sendInjectedResponse('unisat', message.data.id, responseSigndata.result.signature);
      } else {
        this.sendInjectedError('unisat', message.data.id, {
          code: 4001,
          message: 'User rejected the request.'
        });
      }
    } catch (e) {
      this.sendInjectedError('unisat', message.data.id, e);
    }
  }

  // Helper methods
  private getBitcoinNetwork(): BTCMainNetNetwork {
    return this.walletNetworkService.getNetworkByKey('btc') as BTCMainNetNetwork;
  }

  private async getWalletBitcoinAddress(masterWallet: MasterWallet): Promise<string> {
    const bitcoinNetwork = this.getBitcoinNetwork();
    const bitcoinNetworkWallet = await bitcoinNetwork.createNetworkWallet(masterWallet, false);
    const addresses = bitcoinNetworkWallet?.safe.getAddresses(0, 1, false, null);
    return addresses?.[0] || '';
  }

  private async getWalletBitcoinPublicKey(masterWallet: MasterWallet): Promise<string> {
    const bitcoinNetwork = this.getBitcoinNetwork();
    const bitcoinNetworkWallet = await bitcoinNetwork.createNetworkWallet(masterWallet, false);
    return bitcoinNetworkWallet?.safe.getPublicKey();
  }

  /**
   * Updates the Bitcoin wallet address for the current dApp
   */
  private async updateBitcoinWalletAddress(masterWallet: MasterWallet): Promise<void> {
    try {
      this.userBTCAddress = await this.getWalletBitcoinAddress(masterWallet);
      Logger.log('unisatprotocol', 'Updated Bitcoin address:', this.userBTCAddress);
    } catch (error) {
      Logger.error('unisatprotocol', 'Error updating Bitcoin wallet address:', error);
      this.userBTCAddress = null;
    }
  }

  /**
   * Gets the current URL from the dappbrowser service
   */
  private getCurrentUrl(): string {
    return DappBrowserService.instance.url;
  }
}
