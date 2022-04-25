import { SPVNetworkConfig } from "../../../../services/wallet.service";
import { CoinID } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { ERC1155Provider } from "../../evms/nfts/erc1155.provider";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { ElastosERC20SubWallet } from "../evms/esc/subwallets/elastos.erc20.subwallet";

export abstract class ElastosEVMNetwork<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetwork {
  constructor(
    key: string,
    displayName: string,
    logo: string,
    networkTemplate: string,
    chainID: number,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[],
    erc1155Providers?: ERC1155Provider[]) {
    super(
      key,
      displayName,
      logo,
      "ELA",
      "ELA",
      networkTemplate,
      chainID,
      [],
      earnProviders,
      swapProviders,
      bridgeProviders,
      erc1155Providers);
  }

  public async createERC20SubWallet(networkWallet: AnyNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ElastosERC20SubWallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  // TODO: MOVE TO ESC
  /* public getMainEvmRpcApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC));
  }

  // TODO: MOVE TO ESC
  public getMainEvmAccountApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHSC));
  } */

  public getMainTokenSymbol(): string {
    return this.mainTokenSymbol;
  }

  //public abstract getMainChainID(): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig);
}
