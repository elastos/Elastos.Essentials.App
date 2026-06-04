import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DID } from '@elastosfoundation/elastos-connectivity-sdk-js';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import {
  ElastosMainChainMainNetNetwork,
  ElastosMainChainNetworkBase
} from 'src/app/wallet/model/networks/elastos/mainchain/network/elastos.networks';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import {
  BrowserConnectionType,
  BrowserWalletConnectionsService
} from 'src/app/wallet/services/browser-wallet-connections.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DABMessage } from '../dappbrowser.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

enum AddressType {
  Normal_external = 'normal-external',
  Normal_internal = 'normal-internal',
  Owner = 'owner',
  CROwnerDeposit = 'cr-owner-deposit',
  OwnerDeposit = 'owner-deposit',
  OwnerStake = 'owner-stake',
  All = 'all'
}

@Injectable({
  providedIn: 'root'
})
export class ElastosMainchainProtocolService {
  private userELAMainChainAddress: string = null;
  private elamainRpcUrl: string = null;
  private elastosConnectorCode: string = null;

  constructor(
    private walletNetworkService: WalletNetworkService,
    private httpClient: HttpClient,
    private browserWalletConnectionsService: BrowserWalletConnectionsService
  ) {}

  /**
   * Initialize the service by loading the Elastos connector code
   */
  async initialize(): Promise<void> {
    Logger.log('elastosmainchain', 'Loading the IAB elastos connector');
    this.elastosConnectorCode = await this.httpClient
      .get('assets/essentialsiabconnector.js', { responseType: 'text' })
      .toPromise();
  }

  /**
   * Handles Elastos-specific messages from the dApp
   */
  async handleMessage(message: DABMessage): Promise<void> {
    // Handle Elastos Connector messages
    if (message.data.name.startsWith('elastos_')) {
      await this.handleElastosConnectorMessage(message);
      return;
    }

    // Handle ELA Main Chain messages
    if (message.data.name.startsWith('elamain_')) {
      await this.handleElaMainMessage(message);
      return;
    }

    Logger.warn('elastosmainchain', 'Received non-elastos message', message.data.name);
  }

  /**
   * Gets the JavaScript code to inject the Elastos providers into the webpage
   */
  getElastosConnectorInjectionCode(): string {
    if (!this.elastosConnectorCode) {
      Logger.warn('elastosmainchain', 'Elastos connector code not loaded');
      return '';
    }

    return (
      this.elastosConnectorCode +
      "\
        console.log('Essentials dapp browser connector is being created'); \
        window.elastos = new EssentialsDABConnector();\
        console.log('Essentials dapp browser connector is injected', window.elastos);"
    );
  }

  /**
   * Gets the JavaScript code to inject the ELA Main Chain provider
   */
  getElaMainProviderInjectionCode(walletAddress: string, rpcUrl: string): string {
    this.userELAMainChainAddress = walletAddress;
    this.elamainRpcUrl = rpcUrl;

    return `
      const elamainProvider = new DappBrowserElaMainProvider('${rpcUrl}', '${walletAddress}');
      window.elamain = elamainProvider;
      console.log('Essentials Ela main chain providers are injected', elamainProvider);
    `;
  }

  /**
   * Gets the injection code for a specific URL, handling wallet connections and address extraction
   */
  async getInjectionCodeForUrl(url: string): Promise<string> {
    if (!url) {
      Logger.warn('elastosmainchain', 'No URL provided for injection code generation');
      return this.getElaMainProviderInjectionCode('', '') + '\n' + this.getElastosConnectorInjectionCode();
    }

    // For Elastos mainchain, we need to get the ELA address from the connected EVM wallet
    // since Elastos mainchain addresses are derived from EVM wallets
    const evmWallet = await this.browserWalletConnectionsService.getConnectedWallet(url, BrowserConnectionType.EVM);

    let elaMainChainAddress = '';

    if (evmWallet) {
      elaMainChainAddress = await this.getCurrentElaMainChainAddress(evmWallet.masterWallet);
    }

    // Get ELA main chain network RPC URL
    const elaMainChainNetwork =
      this.walletNetworkService.getNetworkByKey('elastos') ||
      this.walletNetworkService.getNetworkByKey('elastos-mainnet');
    const elamainRpcUrl = elaMainChainNetwork?.getRPCUrl() || '';

    return (
      this.getElaMainProviderInjectionCode(elaMainChainAddress, elamainRpcUrl) +
      '\n' +
      this.getElastosConnectorInjectionCode()
    );
  }

  /**
   * Updates the ELA Main Chain address in the injected provider
   */
  async updateElaMainAddress(address: string): Promise<void> {
    this.userELAMainChainAddress = address;

    try {
      await this.executeScript(`
        if (window.elamain && window.elamain.setAddress) {
          window.elamain.setAddress('${address}');
        }
      `);
      Logger.log('elastosmainchain', 'Updated ELA main chain address:', address);
    } catch (error) {
      Logger.error('elastosmainchain', 'Error updating ELA main chain address:', error);
    }
  }

  /**
   * Gets the ELA Main Chain address for the current wallet
   */
  async getCurrentElaMainChainAddress(masterWallet: MasterWallet): Promise<string> {
    const addresses = await this.getWalletELAMainChainAddressesByType(masterWallet, 1);
    return addresses?.[0] || '';
  }

  /**
   * Handle Elastos Connector messages (DID-related)
   */
  private async handleElastosConnectorMessage(message: DABMessage): Promise<void> {
    Logger.log('elastosmainchain', 'Handling Elastos Connector command:', message.data.name);

    switch (message.data.name) {
      case 'elastos_getCredentials':
        dappBrowser.hide();
        await this.handleElastosGetCredentials(message);
        this.showBrowser();
        break;
      case 'elastos_signData':
        dappBrowser.hide();
        await this.handleElastosSignData(message);
        this.showBrowser();
        break;
      case 'elastos_essentials_url_intent':
        dappBrowser.hide();
        await this.handleEssentialsUrlIntent(message);
        this.showBrowser();
        break;
      default:
        Logger.warn('elastosmainchain', 'Unhandled elastos connector message command', message.data.name);
    }
  }

  /**
   * Handle ELA Main Chain provider messages
   */
  private async handleElaMainMessage(message: DABMessage): Promise<void> {
    Logger.log('elastosmainchain', 'Handling ELA Main command:', message.data.name);

    switch (message.data.name) {
      case 'elamain_getMultiAddresses':
        // For ELA main chain, we still use the global active master wallet
        // since ELA main chain connections are not dApp-specific in this implementation
        const masterWallet = WalletService.instance.getActiveMasterWallet();
        const addresses = await this.getWalletELAMainChainAddressesByType(
          masterWallet,
          message.data.object.count,
          message.data.object.type,
          message.data.object.index
        );
        this.sendInjectedResponse('elamain', message.data.id, addresses);
        break;
      case 'elamain_signMessage':
        const response: {
          action: string;
          result: {
            signedDatas: string[];
          };
        } = await GlobalIntentService.instance.sendIntent('https://wallet.web3essentials.io/elamainsignmessage', {
          payload: message.data.object
        });
        if (response.result.signedDatas) {
          this.sendInjectedResponse('elamain', message.data.id, response.result.signedDatas);
        } else {
          this.sendInjectedError('elamain', message.data.id, {
            code: 4001,
            message: 'User rejected the request.'
          });
        }
        break;
      default:
        Logger.warn('elastosmainchain', 'Unhandled elamain message command', message.data.name);
    }
  }

  private async handleElastosGetCredentials(message: DABMessage): Promise<void> {
    try {
      const query = message.data.object as DID.GetCredentialsQuery;

      const res: { result: { presentation: DIDPlugin.VerifiablePresentation } } =
        await GlobalIntentService.instance.sendIntent('https://did.web3essentials.io/credaccess', query);

      if (!res || !res.result || !res.result.presentation) {
        console.warn('Missing presentation. The operation was maybe cancelled.');
        this.sendInjectedError('elastos', message.data.id, 'Missing presentation. The operation was maybe cancelled.');
        return;
      }

      this.sendInjectedResponse('elastos', message.data.id, res.result.presentation);
    } catch (e) {
      this.sendInjectedError('elastos', message.data.id, e);
    }
  }

  private async handleElastosSignData(message: DABMessage): Promise<void> {
    try {
      const query = message.data.object as {
        data: string;
        jwtExtra?: any;
        signatureFieldName?: string;
      };

      const res: { result: DID.SignedData } = await GlobalIntentService.instance.sendIntent(
        'https://did.web3essentials.io/didsign',
        query
      );

      if (!res || !res.result) {
        console.warn('Missing signature data. The operation was maybe cancelled.');
        this.sendInjectedError(
          'elastos',
          message.data.id,
          'Missing signature data. The operation was maybe cancelled.'
        );
        return;
      }

      this.sendInjectedResponse('elastos', message.data.id, res.result);
    } catch (e) {
      this.sendInjectedError('elastos', message.data.id, e);
    }
  }

  /**
   * Generic way to receive all kind of intents as if that came from native intents (eg: android).
   * TODO: This should replace other elastos_methods that don't require specific handling one by one.
   */
  private async handleEssentialsUrlIntent(message: DABMessage): Promise<void> {
    try {
      const query = message.data.object as { url: string; params: any };

      const res: { result: DID.SignedData } = await GlobalIntentService.instance.sendIntent(query.url, query.params);

      if (!res || !res.result) {
        console.warn('Missing response data. The operation was maybe cancelled.');
        this.sendInjectedError('elastos', message.data.id, 'Missing response data. The operation was maybe cancelled.');
        return;
      }

      this.sendInjectedResponse('elastos', message.data.id, res.result);
    } catch (e) {
      this.sendInjectedError('elastos', message.data.id, e);
    }
  }

  /**
   * Sends a successful response to the injected provider
   */
  private sendInjectedResponse(provider: string, id: number, result: any): void {
    const stringifiedResult = JSON.stringify(result);
    const code = `window.${provider}.sendResponse(${id}, ${stringifiedResult})`;
    Logger.log('elastosmainchain', `Sending ${provider} response:`, stringifiedResult);
    void dappBrowser.executeScript({ code });
  }

  /**
   * Sends an error response to the injected provider
   */
  private sendInjectedError(provider: string, id: number, error: string | { code: number; message: string }): void {
    let stringifiedError: string;
    if (provider === 'elastos') {
      stringifiedError = typeof error === 'string' ? error : new String(error).toString();
    } else {
      stringifiedError = JSON.stringify(error);
    }

    const code = `window.${provider}.sendError(${id}, ${stringifiedError})`;
    Logger.log('elastosmainchain', `Sending ${provider} error:`, stringifiedError);
    void dappBrowser.executeScript({ code });
  }

  /**
   * Executes JavaScript code in the browser context
   */
  private executeScript(code: string): Promise<void> {
    return dappBrowser.executeScript({ code });
  }

  /**
   * Show the browser view
   */
  private showBrowser(): void {
    void dappBrowser.show();
  }

  // ELA Main Chain Network and Address Methods

  private getELAMainChainNetwork(): ElastosMainChainMainNetNetwork {
    return this.walletNetworkService.getNetworkByKey(
      ElastosMainChainNetworkBase.networkKey
    ) as ElastosMainChainMainNetNetwork;
  }

  private async getWalletELAMainChainAddressesByType(
    masterWallet: MasterWallet,
    count: number,
    type: AddressType = AddressType.Normal_external,
    index = 0
  ): Promise<string[]> {
    const elaMainChainNetwork = this.getELAMainChainNetwork();
    const elaMainChainNetworkWallet = await elaMainChainNetwork.createNetworkWallet(masterWallet, false);
    if (!elaMainChainNetworkWallet) return [];

    const elaSubwallet = elaMainChainNetworkWallet.getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;

    let addressArray: string[] = [];
    let address: string = null;
    let internal = false;

    switch (type) {
      case AddressType.CROwnerDeposit:
        address = elaSubwallet.getCRDepositAddress();
        if (address) addressArray.push(address);
        break;
      case AddressType.Owner:
        address = elaSubwallet.getOwnerAddress();
        if (address) addressArray.push(address);
        break;
      case AddressType.OwnerDeposit:
        address = elaSubwallet.getOwnerDepositAddress();
        if (address) addressArray.push(address);
        break;
      case AddressType.OwnerStake:
        address = elaSubwallet.getOwnerStakeAddress();
        if (address) addressArray.push(address);
        break;
      case AddressType.Normal_internal:
        internal = true;
      // eslint-disable-next-line no-fallthrough
      case AddressType.Normal_external:
        addressArray = elaMainChainNetworkWallet.safe.getAddresses(index, count, internal, null);
        break;
      case AddressType.All:
        // Add all special addresses first, then half the external addresses and half the internal addresses
        address = elaSubwallet.getCRDepositAddress();
        if (address) addressArray.push(address);
        address = elaSubwallet.getOwnerAddress();
        if (address) addressArray.push(address);
        address = elaSubwallet.getOwnerDepositAddress();
        if (address) addressArray.push(address);
        address = elaSubwallet.getOwnerStakeAddress();
        if (address) addressArray.push(address);

        const addressAccount = Math.ceil(count / 2);
        const addressesExternal = elaMainChainNetworkWallet.safe.getAddresses(index, addressAccount, true, null);
        addressArray = [...addressArray, ...addressesExternal];

        const addressesInternal = elaMainChainNetworkWallet.safe.getAddresses(index, addressAccount, false, null);
        addressArray = [...addressArray, ...addressesInternal];
        break;
    }
    return addressArray;
  }
}
