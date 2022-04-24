import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID, ERC20Coin } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { PrivateKeyType, WalletNetworkOptions } from "../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../base/networkapiurltype";
import { Network } from "../network";
import { EVMNetworkWallet } from "./networkwallets/evm.networkwallet";
import { ERC20SubWallet } from "./subwallets/erc20.subwallet";

export abstract class EVMNetwork extends Network<WalletNetworkOptions> {
  protected averageBlocktime = 5; // Unit Second
  protected mainRpcUrl: string = null;

  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string, // Path to the network icon
    protected mainTokenSymbol: string, // Symbol of the main EVM token: Ex: HT, BSC...
    protected mainTokenFriendlyName: string, // Ex: Huobi Token
    networkTemplate: string, // For which network template is this network available
    protected chainID: number,
    protected builtInCoins?: ERC20Coin[],
    earnProviders: EarnProvider[] = [],
    swapProviders: SwapProvider[] = [],
    bridgeProviders: BridgeProvider[] = []
  ) {
    super(key, name, logo, networkTemplate, earnProviders, swapProviders, bridgeProviders);
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }

  /**
   * Live update of this network instance info. Used for example when a custom network info is modified
   * by the user.
   */
  public updateInfo(name: string, chainId: number, rpcUrl: string, mainCurrencySymbol: string) {
    this.name = name;
    this.chainID = chainId;
    this.mainRpcUrl = rpcUrl;
    this.mainTokenFriendlyName = mainCurrencySymbol;
    this.mainTokenSymbol = mainCurrencySymbol;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return this.builtInCoins || [];
  }

  /* public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new StandardEVMNetworkWallet(masterWallet as StandardMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName, this.averageBlocktime);
        break;
      case WalletType.LEDGER:
        wallet = new LedgerEVMNetworkWallet(masterWallet as LedgerMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName, this.averageBlocktime);
        break;
      default:
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  } */

  /**
 * Creates the right ERC20 sub wallet instance for this network.
 * If startBackgroundUpdates is true some initializations such as getting balance or transactions are launched in background.
 * Otherwise, startBackgroundUpdates() has to be called manually later on the network wallet.
 */
  public async createERC20SubWallet(networkWallet: EVMNetworkWallet<any, any>, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ERC20SubWallet(networkWallet, coinID, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC), "");
    await subWallet.initialize();

    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();

    return subWallet;
  }

  /**
  * Returns the url of a target api type. This method must be overriden by most networks to define
  * one or several available API endpoing such as the main RPC node, covalent, etherscan, etc.
  *
  * For custom networks, only mainRpcUrl is loaded from disk and returned.
  */
  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return this.mainRpcUrl;
    else
      throw new Error(`EVMNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainTokenSymbol(): string {
    return this.mainTokenSymbol;
  }

  /**
   * Returns the EVM chain ID for this network (i.e. 128 for heco) according to the active network template.
   * For elastos, as there are multiple EVM chains, the ETHSC is the "main" one.
   */
  public getMainChainID(networkTemplate?: string): number {
    return this.chainID;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string) {
    onGoingConfig[this.getEVMSPVConfigName()] = {
      ChainID: this.getMainChainID(networkTemplate),
      NetworkID: this.getMainChainID(networkTemplate)
    };
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.EVM];
  }

  public supportsERC20Coins(): boolean {
    return true;
  }

  public supportsERCNFTs(): boolean {
    return true;
  }
}