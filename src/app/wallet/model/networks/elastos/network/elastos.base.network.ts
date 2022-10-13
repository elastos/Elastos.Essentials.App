import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk/typings/config";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { ERC1155Provider } from "../../evms/nfts/erc1155.provider";
import { Network } from "../../network";

export abstract class ElastosNetworkBase<WalletNetworkOptionsType extends WalletNetworkOptions> extends Network<WalletNetworkOptionsType> {
  constructor(
    key: string,
    displayName: string,
    shortDisplayName: string,
    logo: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[],
    erc1155Providers?: ERC1155Provider[]) {
    super(
      key,
      displayName,
      shortDisplayName,
      logo,
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders,
      erc1155Providers);
  }

  public getMainTokenSymbol(): string {
    return 'ELA';
  }

  public getMainColor(): string {
    return "5D37C0";
  }

  public abstract updateSPVNetworkConfig(onGoingConfig: ConfigInfo);
}
