import { SPVNetworkConfig } from "../../services/wallet.service";
import { CoinID, ERC20Coin } from "../Coin";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { EVMNetworkWallet } from "../wallets/evm.networkwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";
import { Network } from "./network";

export class EVMNetwork extends Network {
  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string, // Path to the network icon
    protected mainTokenSymbol: string, // Symbol of the main EVM token: Ex: HT, BSC...
    protected mainTokenFriendlyName: string, // Ex: Huobi Token
    public mainRpcUrlApi: string, // TODO: move into networkTemplateConfigs or flatten networkTemplateConfigs only for the active network template
    public accountRpcUrlApi: string, // TODO: move into networkTemplateConfigs or flatten networkTemplateConfigs only for the active network template
    networkTemplateAvailability: string, // For which network tempalte is this network available
    protected chainID: number,
    protected builtInCoins?: ERC20Coin[],
  ) {
    super(key, name, logo);
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return this.builtInCoins || [];
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new EVMNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public createERC20SubWallet(networkWallet: EVMNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): ERC20SubWallet {
    let subWallet = new ERC20SubWallet(networkWallet, coinID, networkWallet.network.getMainEvmRpcApiUrl(), "");
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
}
