/**
 * This service manages connections made by dapps in the built in browser to wallet accounts.
 * In the past, this was done automatically by using the active master wallet as wallet in the browser.
 * Nevertheless, this is no longer the case as we need t omaintain different wallet connections for different
 * dapps, and handle the bitcoin wallet separately from the EVM wallet (a different wallet mnemonic
 * rather often).
 *
 * NOTE: for now this is not related to how wallet connect works. This is only for injected connections.
 * Though this could support wallet connect in the future ideally.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { WalletChooserEntry, WalletChooserFilter } from '../components/wallet-chooser/wallet-chooser.component';
import { MasterWallet } from '../model/masterwallets/masterwallet';
import { BTCNetworkBase } from '../model/networks/btc/network/btc.base.network';
import { AnyBTCNetworkWallet } from '../model/networks/btc/networkwallets/btc.networkwallet';
import { EVMNetwork } from '../model/networks/evms/evm.network';
import { AnyEVMNetworkWallet } from '../model/networks/evms/networkwallets/evm.networkwallet';
import { AnyNetwork } from '../model/networks/network';
import { WalletNetworkService } from './network.service';
import { WalletNetworkUIService } from './network.ui.service';
import { LocalStorage } from './storage.service';
import { WalletService } from './wallet.service';
import { WalletUIService } from './wallet.ui.service';

/**
 * Type of connection to the browser. For now we only have injected providers
 * for EVM and BTC. We could support ELA too but not implemented yet.
 */
export enum BrowserConnectionType {
  EVM,
  BITCOIN
}

/**
 * Represents a wallet connection for a specific dapp and connection type
 */
interface DappWalletConnection {
  masterWalletId: string; // ID of the connected master wallet
  networkKey?: string; // Network key for this connection (optional, uses wallet default if not set)
  connectedAt: number; // Timestamp when connection was established
}

/**
 * Network selection for a specific dapp
 */
interface DappEVMNetworkSelection {
  networkKey: string; // Selected network key
  selectedAt: number; // Timestamp when network was selected
}

/**
 * Storage structure for all dapp connections
 * Key format: "domain:port" (e.g., "app.uniswap.org:443")
 */
interface DappConnectionsStorage {
  [dappDomain: string]: {
    // evm
    evmNetwork?: DappEVMNetworkSelection;
    evm?: DappWalletConnection;

    // bitcoin
    btc?: DappWalletConnection;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BrowserWalletConnectionsService {
  public static instance: BrowserWalletConnectionsService = null;
  private readonly STORAGE_KEY = 'browser-wallet-connections';

  // Reactive subjects for dApp-specific wallet connections
  public activeDappUrl = new BehaviorSubject<string>(null);
  public activeDappEVMWallet = new BehaviorSubject<AnyEVMNetworkWallet>(null);
  public activeDappBitcoinWallet = new BehaviorSubject<AnyBTCNetworkWallet>(null);
  public activeDappEVMNetwork = new BehaviorSubject<EVMNetwork>(null);

  constructor(
    private storage: LocalStorage,
    private walletUIService: WalletUIService,
    private walletNetworkUIService: WalletNetworkUIService,
    private walletService: WalletService,
    private networkService: WalletNetworkService
  ) {
    BrowserWalletConnectionsService.instance = this;
  }

  /**
   * Normalizes a URL by removing trailing slashes for consistent comparison
   * @param url The URL to normalize
   * @returns Normalized URL without trailing slash
   */
  private normalizeUrl(url: string): string {
    if (!url) {
      return url;
    }
    // Remove trailing slash, but keep the protocol and other parts
    return url.replace(/\/+$/, '');
  }

  /**
   * Extracts the domain from a URL for sandboxing connections
   * @param url The full URL of the dapp
   * @returns Domain in format "domain:port"
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
      return `${urlObj.hostname}:${port}`;
    } catch (error) {
      Logger.warn('wallet', 'Invalid URL provided to extractDomain:', url, error);
      return url; // Fallback to original string
    }
  }

  /**
   * Loads all dapp connections from storage
   */
  private async loadConnections(): Promise<DappConnectionsStorage> {
    const connections = await this.storage.get(this.STORAGE_KEY);
    return connections || {};
  }

  /**
   * Saves all dapp connections to storage
   */
  private async saveConnections(connections: DappConnectionsStorage): Promise<void> {
    await this.storage.set(this.STORAGE_KEY, JSON.stringify(connections));
  }

  /**
   * Gets the connected wallet for a specific dapp and connection type
   * @param dappUrl The URL of the dapp
   * @param connectionType The type of connection (EVM or BTC)
   * @returns The connected network wallet or null if not connected
   */
  public async getConnectedWallet(
    dappUrl: string,
    connectionType: BrowserConnectionType.EVM
  ): Promise<AnyEVMNetworkWallet | null>;
  public async getConnectedWallet(
    dappUrl: string,
    connectionType: BrowserConnectionType.BITCOIN
  ): Promise<AnyBTCNetworkWallet | null>;
  public async getConnectedWallet(
    dappUrl: string,
    connectionType: BrowserConnectionType
  ): Promise<AnyEVMNetworkWallet | AnyBTCNetworkWallet | null> {
    const domain = this.extractDomain(dappUrl);
    const connections = await this.loadConnections();

    const dappConnections = connections[domain];
    if (!dappConnections) {
      return null;
    }

    const connectionKey = connectionType === BrowserConnectionType.EVM ? 'evm' : 'btc';
    const connection = dappConnections[connectionKey];

    if (!connection) {
      return null;
    }

    // Get the master wallet
    const masterWallet = this.walletService.getMasterWallet(connection.masterWalletId);
    if (!masterWallet) {
      Logger.warn('wallet', 'Master wallet not found for masterWalletId:', connection.masterWalletId);
      return null;
    }

    // Determine which network to use for this dapp
    let targetNetwork = this.networkService.activeNetwork.value; // Default to app's active network

    // For EVM connections, check if this dapp has a specific EVM network selected
    if (connectionType === BrowserConnectionType.EVM && dappConnections.evmNetwork) {
      const selectedNetwork = this.networkService.getNetworkByKey(dappConnections.evmNetwork.networkKey);
      if (selectedNetwork) {
        targetNetwork = selectedNetwork;
      }
    }
    // For Bitcoin connections, use the default network (Bitcoin doesn't have separate network selection)

    // Create network wallet for the target network
    try {
      const networkWallet = await targetNetwork.createNetworkWallet(masterWallet, false);
      if (!networkWallet) {
        Logger.warn(
          'wallet',
          'Failed to create network wallet for masterWalletId:',
          connection.masterWalletId,
          'network:',
          targetNetwork.key
        );
        return null;
      }

      return networkWallet as AnyEVMNetworkWallet | AnyBTCNetworkWallet;
    } catch (error) {
      Logger.error('wallet', 'Error creating network wallet for dapp:', domain, 'error:', error);
      return null;
    }
  }

  /**
   * Connects a wallet for a specific dapp and connection type
   *
   * @param dappUrl The URL of the dapp
   * @param connectionType The type of connection (EVM or BTC)
   * @param masterWalletId Optional specific wallet ID to connect (if not provided, user will be prompted to select)
   * @returns The connected network wallet or null if cancelled
   */
  public async connectWallet(
    dappUrl: string,
    connectionType: BrowserConnectionType,
    useActiveWallet?: boolean,
    masterWalletId?: string
  ): Promise<MasterWallet | null> {
    const domain = this.extractDomain(dappUrl);
    Logger.log('wallet', `Connecting wallet of type: ${connectionType.toString()} for dapp:`, domain);

    let selectedWallet: MasterWallet;

    if (masterWalletId) {
      // Use provided wallet ID
      selectedWallet = this.walletService.getMasterWallet(masterWalletId);
      if (!selectedWallet) {
        Logger.warn('wallet', 'Provided masterWalletId not found:', masterWalletId);
        return null;
      }
    } else if (useActiveWallet) {
      selectedWallet = this.walletService.getActiveMasterWallet();
      if (!selectedWallet) {
        Logger.warn('wallet', 'Active master wallet not found');
        return null;
      } else {
        if (connectionType === BrowserConnectionType.EVM) {
          // Allow wallets that support EVM networks or have no network wallet (will be filtered later)
          if (!selectedWallet.getSupportedNetworks().some(network => network instanceof EVMNetwork)) {
            Logger.warn('wallet', 'Active master wallet does not support any EVM networks');
            return null;
          }
        } else if (connectionType === BrowserConnectionType.BITCOIN) {
          // Get bitcoin networks
          const bitcoinNetworks = this.networkService.networksList.value.filter(
            network => network instanceof BTCNetworkBase
          );

          if (!bitcoinNetworks.some(network => selectedWallet.supportsNetwork(network))) {
            Logger.warn('wallet', 'Active master wallet does not support any bitcoin networks');
            return null;
          }
        }
      }
    } else  {
      // Let user pick a wallet
      const filter: WalletChooserFilter = (walletEntry: WalletChooserEntry) => {
        console.log('wallet', 'Filtering wallet entry:', walletEntry);

        const { masterWallet, networkWallet } = walletEntry;

        // For browser wallet selection, we want to show all master wallets
        // The actual network compatibility will be checked when creating the connection
        if (connectionType === BrowserConnectionType.EVM) {
          // Allow wallets that support EVM networks or have no network wallet (will be filtered later)
          return masterWallet.getSupportedNetworks().some(network => network instanceof EVMNetwork);
        } else if (connectionType === BrowserConnectionType.BITCOIN) {
          // Get bitcoin networks
          const bitcoinNetworks = this.networkService.networksList.value.filter(
            network => network instanceof BTCNetworkBase
          );

          return bitcoinNetworks.some(network => masterWallet.supportsNetwork(network));
        }

        return true;
      };

      selectedWallet = await this.walletUIService.pickWallet(filter, false, true, false);
      if (!selectedWallet) {
        Logger.log('wallet', 'Wallet selection cancelled for dapp:', domain);
        return null;
      }
    }

    // For EVM connections, handle chain verification and network selection
    if (connectionType === BrowserConnectionType.EVM) {
      const selectedNetwork = await this.handleEVMChainVerification(dappUrl, selectedWallet);
      if (!selectedNetwork) {
        Logger.warn('wallet', 'No suitable EVM network found for wallet:', selectedWallet.name);
        return null;
      }
      Logger.log('wallet', 'Selected EVM network for connection:', selectedNetwork.getEffectiveName());
    }

    // Save the connection
    const connections = await this.loadConnections();
    if (!connections[domain]) {
      connections[domain] = {};
    }

    const connectionKey = connectionType === BrowserConnectionType.EVM ? 'evm' : 'btc';
    connections[domain][connectionKey] = {
      masterWalletId: selectedWallet.id,
      connectedAt: Date.now()
    };

    await this.saveConnections(connections);

    Logger.log(
      'wallet',
      `Connected ${connectionType === BrowserConnectionType.EVM ? 'EVM' : 'BTC'} wallet for dapp:`,
      domain,
      selectedWallet.name
    );

    // Update reactive subjects if this affects the active dApp
    console.log('active dapp url:', this.activeDappUrl.value, 'dapp url:', dappUrl);
    if (this.normalizeUrl(this.activeDappUrl.value) === this.normalizeUrl(dappUrl)) {
      await this.updateActiveDappConnections();
    }

    Logger.log('wallet', 'Connected wallet:', selectedWallet, 'for type:', connectionType, 'for dapp:', dappUrl);

    return selectedWallet;
  }

  /**
   * Disconnects a wallet for a specific dapp and connection type
   * @param dappUrl The URL of the dapp
   * @param connectionType The type of connection (EVM or BTC)
   */
  public async disconnectWallet(dappUrl: string, connectionType: BrowserConnectionType): Promise<void> {
    const domain = this.extractDomain(dappUrl);
    Logger.log(
      'wallet',
      `Disconnecting ${connectionType === BrowserConnectionType.EVM ? 'EVM' : 'BTC'} wallet for dapp:`,
      domain
    );

    const connections = await this.loadConnections();

    if (connections[domain]) {
      const connectionKey = connectionType === BrowserConnectionType.EVM ? 'evm' : 'btc';
      delete connections[domain][connectionKey];

      // When disconnecting EVM wallet, also unset the selected EVM network.
      // This is how metamask works (which EIP?).
      if (connectionType === BrowserConnectionType.EVM) {
        delete connections[domain].evmNetwork;
      }

      // Clean up empty domain entries
      if (Object.keys(connections[domain]).length === 0) {
        delete connections[domain];
      }

      await this.saveConnections(connections);
    }

    Logger.log(
      'wallet',
      `Disconnected ${connectionType === BrowserConnectionType.EVM ? 'EVM' : 'BTC'} wallet for dapp:`,
      domain
    );

    // Update reactive subjects if this affects the active dApp
    if (this.normalizeUrl(this.activeDappUrl.value) === this.normalizeUrl(dappUrl)) {
      await this.updateActiveDappConnections();
    }
  }

  /**
   * Selects an EVM network for a specific dapp
   * @param dappUrl The URL of the dapp
   * @param networkKey Optional specific network key (if not provided, user will be prompted to select)
   * @returns The selected EVM network or null if cancelled
   */
  public async selectEVMNetwork(dappUrl: string, networkKey?: string): Promise<EVMNetwork | null> {
    const domain = this.extractDomain(dappUrl);
    Logger.log('wallet', 'Selecting EVM network for dapp:', domain);

    let selectedNetwork: EVMNetwork;

    if (networkKey) {
      // Use provided network key
      selectedNetwork = this.networkService.getNetworkByKey(networkKey) as EVMNetwork;
      if (!selectedNetwork) {
        Logger.warn('wallet', 'Provided networkKey not found:', networkKey);
        return null;
      }
    } else {
      // Let user pick a network - filter to only show EVM networks
      const evmNetworkFilter = (network: AnyNetwork): boolean => network.isEVMNetwork();
      selectedNetwork = (await this.walletNetworkUIService.pickNetwork(evmNetworkFilter)) as EVMNetwork;
      if (!selectedNetwork) {
        Logger.log('wallet', 'EVM network selection cancelled for dapp:', domain);
        return null;
      }
    }

    // Save the EVM network selection
    const connections = await this.loadConnections();
    if (!connections[domain]) {
      connections[domain] = {};
    }

    connections[domain].evmNetwork = {
      networkKey: selectedNetwork.key,
      selectedAt: Date.now()
    };

    await this.saveConnections(connections);

    Logger.log('wallet', 'Selected EVM network for dapp:', domain, selectedNetwork.getEffectiveName());

    // Update reactive subjects if this affects the active dApp
    if (this.normalizeUrl(this.activeDappUrl.value) === this.normalizeUrl(dappUrl)) {
      await this.updateActiveDappConnections();
    }

    return selectedNetwork;
  }

  /**
   * Gets all connections for a specific dapp
   * @param dappUrl The URL of the dapp
   * @returns Object containing EVM, BTC, and EVM network connections
   */
  public async getDappConnections(dappUrl: string): Promise<{
    evm: DappWalletConnection | null;
    btc: DappWalletConnection | null;
    evmNetwork: DappEVMNetworkSelection | null;
  }> {
    const domain = this.extractDomain(dappUrl);
    const connections = await this.loadConnections();

    const dappConnections = connections[domain] || {};

    return {
      evm: dappConnections.evm || null,
      btc: dappConnections.btc || null,
      evmNetwork: dappConnections.evmNetwork || null
    };
  }

  /**
   * Sets the currently active dApp and updates reactive subjects
   * @param dappUrl The URL of the active dApp
   */
  public async setActiveDapp(dappUrl: string): Promise<void> {
    if (this.normalizeUrl(this.activeDappUrl.value) === this.normalizeUrl(dappUrl)) {
      console.log('BrowserWalletConnections: URL already active, skipping:', dappUrl);
      return; // Already active
    }

    console.log('BrowserWalletConnections: Setting active dApp:', dappUrl);
    this.activeDappUrl.next(dappUrl);

    // Check if there are saved connections for this dApp
    const connections = await this.getDappConnections(dappUrl);
    // If no connection info is saved, default to connect current wallet
    if (!connections.evm && !connections.btc) {
      const activeWallet = this.walletService.getActiveMasterWallet();
      if (activeWallet) {
        // Try to connect wallets by default
        try {
          await this.connectWallet(dappUrl, BrowserConnectionType.EVM, true);
          await this.connectWallet(dappUrl, BrowserConnectionType.BITCOIN, true);
        } catch (error) {
          Logger.warn('wallet', 'Failed to auto-connect EVM and BTC wallets:', error);
        }
      }
    }

    // Update reactive subjects with the current connections for this dApp
    await this.updateActiveDappConnections();
  }

  /**
   * Updates the reactive subjects with current connections for the active dApp
   */
  private async updateActiveDappConnections(): Promise<void> {
    console.log('BrowserWalletConnectionsService: Updating active dApp connections');
    const currentUrl = this.activeDappUrl.value;
    if (!currentUrl) {
      this.activeDappEVMWallet.next(null);
      this.activeDappBitcoinWallet.next(null);
      this.activeDappEVMNetwork.next(null);
      return;
    }

    try {
      // Load EVM wallet connection
      const evmWallet = await this.getConnectedWallet(currentUrl, BrowserConnectionType.EVM);
      this.activeDappEVMWallet.next(evmWallet);

      // Load Bitcoin wallet connection
      const bitcoinWallet = await this.getConnectedWallet(currentUrl, BrowserConnectionType.BITCOIN);
      this.activeDappBitcoinWallet.next(bitcoinWallet);

      // Load EVM network selection
      const selectedEVMNetwork = await this.getSelectedEVMNetwork(currentUrl);
      this.activeDappEVMNetwork.next(selectedEVMNetwork);

      console.log('BrowserWalletConnections: Updated active dApp connections:', {
        url: currentUrl,
        evmWallet: evmWallet?.masterWallet.name || null,
        bitcoinWallet: bitcoinWallet?.masterWallet.name || null,
        evmNetwork: selectedEVMNetwork?.getEffectiveName() || null
      });
    } catch (error) {
      console.error('BrowserWalletConnections: Error updating active dApp connections:', error);
      this.activeDappEVMWallet.next(null);
      this.activeDappBitcoinWallet.next(null);
      this.activeDappEVMNetwork.next(null);
    }
  }

  /**
   * Gets the currently active dApp URL
   */
  public getActiveDappUrl(): string {
    return this.activeDappUrl.value;
  }

  /**
   * Clears the active dApp
   */
  public clearActiveDapp(): void {
    console.log('BrowserWalletConnections: Clearing active dApp');
    this.activeDappUrl.next(null);
    this.activeDappEVMWallet.next(null);
    this.activeDappBitcoinWallet.next(null);
    this.activeDappEVMNetwork.next(null);
  }

  /**
   * Gets the selected EVM network for a specific dapp
   * @param dappUrl The URL of the dapp
   * @returns The selected EVM network or null if not set
   */
  public async getSelectedEVMNetwork(dappUrl: string): Promise<EVMNetwork | null> {
    const domain = this.extractDomain(dappUrl);
    const connections = await this.loadConnections();

    console.log('BrowserWalletConnectionsService: Getting selected EVM network for dapp:', domain);
    console.log('BrowserWalletConnectionsService: Connections:', connections);

    const dappConnections = connections[domain];
    if (!dappConnections?.evmNetwork) {
      return null;
    }

    return this.networkService.getNetworkByKey(dappConnections.evmNetwork.networkKey) as EVMNetwork;
  }

  /**
   * Handles EVM chain verification and network selection when connecting a wallet.
   * This method ensures the connected wallet supports the appropriate network based on:
   * - Active chain ID if there's one and the wallet supports it
   * - Overall active network from wallet service if supported by the wallet
   * - First supported network by the wallet as fallback
   *
   * @param dappUrl The URL of the dapp
   * @param selectedWallet The wallet being connected
   * @returns The selected EVMNetwork or null if no suitable network found
   */
  public async handleEVMChainVerification(dappUrl: string, selectedWallet: MasterWallet): Promise<EVMNetwork | null> {
    const domain = this.extractDomain(dappUrl);
    Logger.log('wallet', 'Handling EVM chain verification for dapp:', domain, 'wallet:', selectedWallet.name);

    // Get supported EVM networks for this wallet
    const supportedEVMNetworks = this.getSupportedEVMNetworks(selectedWallet);

    if (supportedEVMNetworks.length === 0) {
      Logger.warn('wallet', 'Selected wallet does not support any EVM networks:', selectedWallet.name);
      return null;
    }

    Logger.log(
      'wallet',
      'Wallet supports',
      supportedEVMNetworks.length,
      'EVM networks:',
      supportedEVMNetworks.map(n => n.getEffectiveName())
    );

    // 1. Check if there's an active chain for this dapp and wallet supports it
    const connections = await this.loadConnections();
    const dappConnections = connections[domain];

    if (dappConnections?.evmNetwork) {
      const activeNetwork = this.networkService.getNetworkByKey(dappConnections.evmNetwork.networkKey) as EVMNetwork;
      if (activeNetwork && supportedEVMNetworks.includes(activeNetwork)) {
        Logger.log('wallet', 'Keeping existing active network for dapp:', activeNetwork.getEffectiveName());
        return activeNetwork;
      } else {
        Logger.log('wallet', 'Active network not supported by wallet, will select new one');
      }
    }

    // 2. If no active chain or not supported, check the overall active network from wallet service
    const globalActiveNetwork = this.networkService.activeNetwork.value;
    if (
      globalActiveNetwork &&
      globalActiveNetwork.isEVMNetwork() &&
      supportedEVMNetworks.includes(globalActiveNetwork as EVMNetwork)
    ) {
      Logger.log('wallet', 'Using global active network:', globalActiveNetwork.getEffectiveName());

      // Save this network selection for the dapp
      await this.saveEVMNetworkSelection(dappUrl, globalActiveNetwork as EVMNetwork);
      return globalActiveNetwork as EVMNetwork;
    }

    // 3. Use the first supported network as fallback
    const fallbackNetwork = supportedEVMNetworks[0];
    Logger.log('wallet', 'Using first supported network as fallback:', fallbackNetwork.getEffectiveName());

    // Save this network selection for the dapp
    await this.saveEVMNetworkSelection(dappUrl, fallbackNetwork);
    return fallbackNetwork;
  }

  /**
   * Gets all EVM networks supported by a master wallet
   * @param masterWallet The master wallet to check
   * @returns Array of supported EVM networks
   */
  private getSupportedEVMNetworks(masterWallet: MasterWallet): EVMNetwork[] {
    return masterWallet.getSupportedNetworks().filter(network => network.isEVMNetwork()) as EVMNetwork[];
  }

  /**
   * Saves EVM network selection for a dapp
   * @param dappUrl The URL of the dapp
   * @param network The network to save
   */
  private async saveEVMNetworkSelection(dappUrl: string, network: EVMNetwork): Promise<void> {
    const domain = this.extractDomain(dappUrl);
    const connections = await this.loadConnections();

    if (!connections[domain]) {
      connections[domain] = {};
    }

    connections[domain].evmNetwork = {
      networkKey: network.key,
      selectedAt: Date.now()
    };

    await this.saveConnections(connections);
    Logger.log('wallet', 'Saved EVM network selection for dapp:', domain, network.getEffectiveName());
  }
}
