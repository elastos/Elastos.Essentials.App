import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID, ERC20Coin } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { MasterWallet, StandardMasterWallet } from "../../masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../masterwallets/wallet.types";
import { AnyNetworkWallet } from "../base/networkwallets/networkwallet";
import { Network } from "../network";
import { EVMNetworkWallet } from "./networkwallets/evm.networkwallet";
import { ERC20SubWallet } from "./subwallets/erc20.subwallet";

export class EVMNetwork extends Network<WalletNetworkOptions> {
  protected averageBlocktime = 5; // Unit Second

  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string, // Path to the network icon
    protected mainTokenSymbol: string, // Symbol of the main EVM token: Ex: HT, BSC...
    protected mainTokenFriendlyName: string, // Ex: Huobi Token
    public mainRpcUrlApi: string,
    public accountRpcUrlApi: string,
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
  public updateInfo(name: string, chainId: number, rpcUrl: string, accountRpcUrl: string, mainCurrencySymbol: string) {
    this.name = name;
    this.chainID = chainId;
    this.mainRpcUrlApi = rpcUrl;
    this.accountRpcUrlApi = accountRpcUrl;
    this.mainTokenFriendlyName = mainCurrencySymbol;
    this.mainTokenSymbol = mainCurrencySymbol;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return this.builtInCoins || [];
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new EVMNetworkWallet(masterWallet as StandardMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName, this.averageBlocktime);
        break;
      default:
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  }

  public async createERC20SubWallet(networkWallet: EVMNetworkWallet<any, any>, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ERC20SubWallet(networkWallet, coinID, networkWallet.network.getMainEvmRpcApiUrl(), "");
    await subWallet.initialize();

    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();

    return subWallet;
  }

  public getMainEvmRpcApiUrl(): string {
    return this.mainRpcUrlApi;
  }

  public getMainEvmAccountApiUrl(): string {
    return this.accountRpcUrlApi;
  }

  public getMainTokenSymbol(): string {
    return this.mainTokenSymbol;
  }

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
