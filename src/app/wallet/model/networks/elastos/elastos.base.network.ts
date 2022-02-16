import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID, ERC20Coin, StandardCoinName } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { ERC1155Provider } from "../../nfts/erc1155.provider";
import { ElastosERC20SubWallet } from "../../wallets/elastos/elastos.erc20.subwallet";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { Network } from "../network";

export abstract class ElastosNetworkBase extends Network {

  constructor(
    key: string,
    displayName: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[],
    erc1155Providers?: ERC1155Provider[]) {
    super(
      key,
      displayName,
      "assets/wallet/networks/elastos.svg",
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders,
      erc1155Providers);
  }

  protected async initCreatedNetworkWallet(wallet: NetworkWallet, startBackgroundUpdates: boolean): Promise<NetworkWallet> {
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public async createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ElastosERC20SubWallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getMainEvmRpcApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC));
  }

  public getMainEvmAccountApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHSC));
  }

  public getMainTokenSymbol(): string {
    return 'ELA';
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }

  public abstract getMainChainID(): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig);
}