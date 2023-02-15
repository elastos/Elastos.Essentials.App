import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { Coin, NativeCoin } from "../coin";
import { BridgeProvider } from "../earn/bridgeprovider";
import { EarnProvider } from "../earn/earnprovider";
import type { SwapProvider } from "../earn/swapprovider";
import type { MasterWallet } from "../masterwallets/masterwallet";
import type { PrivateKeyType, WalletNetworkOptions } from "../masterwallets/wallet.types";
import { NetworkAPIURLType } from "./base/networkapiurltype";
import type { AnyNetworkWallet } from "./base/networkwallets/networkwallet";
import type { ERC1155Provider } from "./evms/nfts/erc1155.provider";
import { ERC721Provider } from "./evms/nfts/erc721.provider";

export abstract class Network<WalletNetworkOptionsType extends WalletNetworkOptions> {
  private nativeCoin: Coin = null;

  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public shortName: string, // Humane readable network name but as short as possible for small UI locations - eg: "ESC" instead of "Elastos Smart Chain"
    public logo: string, // Path to the network icon
    private nativeTokenId: string,
    public networkTemplate: string, // For which network template is this network available
    public earnProviders: EarnProvider[] = [],
    public swapProviders: SwapProvider[] = [],
    public bridgeProviders: BridgeProvider[] = [],
    public erc1155Providers: ERC1155Provider[] = [],
    public erc721Providers: ERC721Provider[] = [],
  ) {
  }

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
  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    // We don't create networkWallet if the master wallet does not support the active network.
    // eg. the ledger wallet has no ela address or evm address.
    if (!masterWallet.supportsNetwork(this)) {
      Logger.warn("wallet", "Wallet ", masterWallet.name, " does not support network", this.name)
      return null;
    }
    let wallet = await this.newNetworkWallet(masterWallet);
    if (wallet) {
      await wallet.initialize();

      if (startBackgroundUpdates)
        void wallet.startBackgroundUpdates();
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

  public getRPCUrl(): string {
    return this.getAPIUrlOfType(NetworkAPIURLType.RPC);
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

  public abstract updateSPVNetworkConfig(onGoingConfig: ConfigInfo, networkTemplate: string);

  // Ex: ETHHECO, ETHSC, etc
  public getEVMSPVConfigName(): string {
    return "ETH" + this.key.toUpperCase();
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
}

export abstract class AnyNetwork extends Network<any> { }