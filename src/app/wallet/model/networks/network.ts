import type { SPVNetworkConfig } from "../../services/wallet.service";
import { BridgeProvider } from "../earn/bridgeprovider";
import { EarnProvider } from "../earn/earnprovider";
import type { SwapProvider } from "../earn/swapprovider";
import type { MasterWallet } from "../masterwallets/masterwallet";
import type { PrivateKeyType, WalletNetworkOptions } from "../masterwallets/wallet.types";
import { NetworkAPIURLType } from "./base/networkapiurltype";
import type { AnyNetworkWallet } from "./base/networkwallets/networkwallet";
import type { ERC1155Provider } from "./evms/nfts/erc1155.provider";

export abstract class Network<WalletNetworkOptionsType extends WalletNetworkOptions> {
  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string, // Path to the network icon
    public networkTemplate: string, // For which network template is this network available
    public earnProviders: EarnProvider[] = [],
    public swapProviders: SwapProvider[] = [],
    public bridgeProviders: BridgeProvider[] = [],
    public erc1155Providers: ERC1155Provider[] = [],
  ) {
  }

  public init(): Promise<void> {
    return;
  }

  /**
   * Returns default options to customize the wallet for the network.
   * For example in the case of the elastos network, this defines if new wallets are instantiated using
   * single or multi address mode.
   */
  public abstract getDefaultWalletNetworkOptions(): WalletNetworkOptionsType;

  /**
   * Creates a network wallet for the given master wallet.
   * If startBackgroundUpdates is true some initializations such as getting balance or transactions are launched in background.
   * Otherwise, startBackgroundUpdates() has to be called manually later on the network wallet.
   */
  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet = this.newNetworkWallet(masterWallet);

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
  protected abstract newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet;

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

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string);

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
}

export abstract class AnyNetwork extends Network<any> { }