import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { CoinID } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../../masterwallets/wallet.types";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import type { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { Network } from "../../network";

export abstract class TronNetworkBase extends Network<WalletNetworkOptions> {
  public static networkKey = "tron";

  constructor(
    displayName: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[]) {
    super(
      TronNetworkBase.networkKey,
      displayName,
      displayName,
      "assets/wallet/networks/tron.svg",
      "TRON",
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders);
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const StandardTronNetworkWallet = (await import("../networkwallets/standard/standard.tron.networkwallet")).StandardTronNetworkWallet;
        return new StandardTronNetworkWallet(masterWallet as StandardMasterWallet, this);
      default:
        Logger.warn('wallet', 'TRON does not support ', masterWallet.type);
        return null;
    }
  }

  public async createERC20SubWallet(networkWallet: AnyNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    return await null;
  }

  public getMainEvmAccountApiUrl(): string {
    return null;
  }

  public getMainTokenSymbol(): string {
    return 'TRX';
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.EVM];
  }

  public getMainColor(): string {
    return "a62c25";
  }
}