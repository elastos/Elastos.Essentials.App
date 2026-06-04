import { Logger } from 'src/app/logger';
import { WalletNetworkService } from '../../services/network.service';
import { Coin, NativeCoin } from '../coin';
import { BridgeProvider } from '../earn/bridgeprovider';
import { EarnProvider } from '../earn/earnprovider';
import type { SwapProvider } from '../earn/swapprovider';
import type { MasterWallet } from '../masterwallets/masterwallet';
import type { PrivateKeyType, WalletNetworkOptions } from '../masterwallets/wallet.types';
import { RPCUrlProvider } from '../rpc-url-provider';
import { TransactionInfoType } from '../tx-providers/transaction.types';
import { NetworkAPIURLType } from './base/networkapiurltype';
import type { AnyNetworkWallet } from './base/networkwallets/networkwallet';
import type { ERC1155Provider } from './evms/nfts/erc1155.provider';
import { ERC721Provider } from './evms/nfts/erc721.provider';

export abstract class Network<WalletNetworkOptionsType extends WalletNetworkOptions> {
  private nativeCoin: Coin = null;

  constructor(
    public key: string, // unique identifier
    protected name: string, // Human readable network name - Elastos, HECO
    public shortName: string, // Humane readable network name but as short as possible for small UI locations - eg: "ESC" instead of "Elastos Smart Chain"
    public logo: string, // Path to the network icon
    private nativeTokenId: string,
    public networkTemplate: string, // For which network template is this network available
    public rpcUrlProviders: RPCUrlProvider[] = [],
    public earnProviders: EarnProvider[] = [],
    public swapProviders: SwapProvider[] = [],
    public bridgeProviders: BridgeProvider[] = [],
    public erc1155Providers: ERC1155Provider[] = [],
    public erc721Providers: ERC721Provider[] = []
  ) {}

  public init(): Promise<void> {
    this.nativeCoin = new NativeCoin(this, this.nativeTokenId, this.getMainTokenSymbol(), this.getMainTokenSymbol());
    return;
  }

  /**
   * Returns default options to customize the wallet for the network.
   * For example in the case of the elastos network, this defines if new wallets are instantiated using
   * single or multi address mode.
   */
  public abstract getDefaultWalletNetworkOptions(): WalletNetworkOptionsType;

  public getNativeCoin() {
    return this.nativeCoin;
  }

  /**
   * Creates a network wallet for the given master wallet.
   * If startBackgroundUpdates is true some initializations such as getting balance or transactions are launched in background.
   * Otherwise, startBackgroundUpdates() has to be called manually later on the network wallet.
   */
  public async createNetworkWallet(
    masterWallet: MasterWallet,
    startBackgroundUpdates = true
  ): Promise<AnyNetworkWallet> {
    // We don't create networkWallet if the master wallet does not support the active network.
    // eg. the ledger wallet has no ela address or evm address.
    if (!masterWallet.supportsNetwork(this)) {
      Logger.warn('wallet', 'Wallet ', masterWallet.name, ' does not support network', this.name);
      return null;
    }
    let wallet = await this.newNetworkWallet(masterWallet);
    if (wallet) {
      await wallet.initialize();

      if (startBackgroundUpdates) void wallet.startBackgroundUpdates();
    }

    return wallet;
  }

  /**
   * Method called by createNetworkWallet() and that must be implemented by each network to create
   * wallet instances.
   */
  protected abstract newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet>;

  /**
   * Returns the url of a target api type. This method must be overriden by networks to define
   * one or several available API endpoints such as the main RPC node, covalent, etherscan, etc.
   *
   * Throws an exception if the requested url type is missing.
   */
  public abstract getAPIUrlOfType(type: NetworkAPIURLType): string;

  /**
   * Returns the default RPC url for a built-in network, without any applied overrides.
   */
  public getDefaultRPCUrl(): string {
    return this.getAPIUrlOfType(NetworkAPIURLType.RPC);
  }

  public getRPCUrl(): string {
    // Use overridden value if available, otherwise use the default implementation
    return WalletNetworkService.instance?.getOverridenNetworkRpcUrl(this) ?? this.getSelectedRpcUrl();
  }

  /**
   * Returns the selected RPC url for the network.
   * - For custom networks, this is the only url configured.
   * - For built-in networks, this is the url of the selected (or default) provider.
   */
  public getSelectedRpcUrl(): string {
    if (this.isCustom()) {
      return this.getAPIUrlOfType(NetworkAPIURLType.RPC);
    }

    const selectedRpcProvider = this.getSelectedRpcProvider();
    if (!selectedRpcProvider) {
      throw new Error(
        `getSelectedRpcUrl(): no selected RPC provider found for network ${this.key} this is abnormal. Have rpc url providers been configured for this network?`
      );
    }

    return this.getSelectedRpcProvider().url;
  }

  /**
   * Returns the selected RPC provider (by the user) for the network.
   * Only call this on built-in networks.
   *
   * - if existing, this is the url selected by the user and saved to network overrides by the wallet service.
   * - if no url was marked selected, the first provider of the hardcoded list is returned.
   */
  public getSelectedRpcProvider(): RPCUrlProvider {
    if (this.isCustom()) {
      throw new Error('getSelectedRpcProvider() can only be called on built-in networks.');
    }

    // Check if there's a selected RPC URL from the wallet service
    const selectedRpcUrl = WalletNetworkService.instance?.getSelectedRpcUrl(this.key);
    if (selectedRpcUrl) {
      // First check built-in providers
      const builtinProvider = this.rpcUrlProviders.find(provider => provider.url === selectedRpcUrl);
      if (builtinProvider) {
        return builtinProvider;
      }

      // Then check custom providers
      const customProviders = WalletNetworkService.instance?.getCustomRpcUrls(this.key) || [];
      const customProvider = customProviders.find(provider => provider.url === selectedRpcUrl);
      if (customProvider) {
        return customProvider;
      }
    }

    // No selection or selected URL not found, return the first built-in provider
    return this.rpcUrlProviders[0];
  }

  /**
   * Returns all available RPC providers for this network (built-in + custom).
   * Only call this on built-in networks.
   */
  public getAllRpcProviders(): RPCUrlProvider[] {
    if (this.isCustom()) {
      throw new Error('getAllRpcProviders() can only be called on built-in networks.');
    }

    const customProviders = WalletNetworkService.instance?.getCustomRpcUrls(this.key) || [];
    return [...this.rpcUrlProviders, ...customProviders];
  }

  /**
   * Sets the selected RPC URL for this network.
   * Only call this on built-in networks.
   */
  public async setSelectedRpcUrl(rpcUrl: string): Promise<void> {
    if (this.isCustom()) {
      throw new Error('setSelectedRpcUrl() can only be called on built-in networks.');
    }

    await WalletNetworkService.instance?.setSelectedRpcUrl(this.key, rpcUrl);
  }

  /**
   * Returns the effective network name, considering any user overrides
   */
  public getEffectiveName(): string {
    return WalletNetworkService.instance?.getEffectiveNetworkName(this) ?? this.name;
  }

  /**
   * Returns the default network name (without any user overrides)
   */
  public getDefaultName(): string {
    return this.name;
  }

  /**
   * User can view information directly on an external browser.
   */
  public getBrowserUrlByType(type: TransactionInfoType, value: string): string {
    let browserUrl = this.getAPIUrlOfType(NetworkAPIURLType.BLOCK_EXPLORER);
    switch (type) {
      case TransactionInfoType.ADDRESS:
        browserUrl += '/address/';
        break;
      case TransactionInfoType.BLOCKID:
        browserUrl += '/block/';
        break;
      case TransactionInfoType.TXID:
        browserUrl += '/tx/';
        break;
      default:
        Logger.warn('wallet', 'getBrowserUrlByType: not support ', type);
        break;
    }
    return browserUrl + value;
  }

  public abstract getMainTokenSymbol(): string;

  /* public supportedWalletCreateTypes(): WalletCreateType[] {
    return [WalletCreateType.MNEMONIC, WalletCreateType.PRIVATE_KEY_EVM, WalletCreateType.KEYSTORE];
  } */

  /**
   * List of private key types that are supported by this network.
   */
  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    // None by default. If this method is not overriden by the network,
    // the network can't handle any import by private key
    return [];
  }

  // Ex: ETHHECO, ETHSC, etc
  public getEVMSPVConfigName(): string {
    return 'ETH' + this.key.toUpperCase();
  }

  public supportsERC20Coins(): boolean {
    return false;
  }

  public supportsERCNFTs(): boolean {
    return false;
  }

  public supportsTRC20Coins(): boolean {
    return false;
  }

  /**
   * Tells if this network is EVM compatible or not. Used in replacement to "network instanceof EVMNetwork" to reduce circular dependencies
   */
  public isEVMNetwork(): boolean {
    return false;
  }

  /**
   * Returns the main color that matches the network "culture". Usually, this is a color extracted
   * from the main network icon. This color is used for example on some widgets, to highlight the current active network.
   * The returned color is a hex code without the leading #. EG: "FF34E6".
   * Networks without a specific color can return null, and a default essentials color will be used.
   */
  public getMainColor(): string {
    return null;
  }

  public equals(network: AnyNetwork): boolean {
    return this.key === network.key;
  }

  /**
   * Whether this network is a custom network that was added by the user.
   */
  public isCustom(): boolean {
    return false;
  }
}

export abstract class AnyNetwork extends Network<any> {}
