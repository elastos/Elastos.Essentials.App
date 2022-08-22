import { Logger } from "src/app/logger";
import type { SPVNetworkConfig } from "../../../../services/wallet.service";
import type { CoinID } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import type { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../../masterwallets/wallet.types";
import { WalletCreateType } from "../../../walletaccount";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import type { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { Network } from "../../network";

export abstract class BTCNetworkBase extends Network<WalletNetworkOptions> {
  public static networkKey: "btc" = "btc";

  constructor(
    displayName: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[]) {
    super(
      BTCNetworkBase.networkKey,
      displayName,
      displayName,
      "assets/wallet/networks/btc.svg",
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
        const StandardBTCNetworkWallet = (await import("../networkwallets/standard/standard.btc.networkwallet")).StandardBTCNetworkWallet;
        return new StandardBTCNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const LedgerBTCNetworkWallet = (await import("../networkwallets/ledger/ledger.btc.networkwallet")).LedgerBTCNetworkWallet;
        return new LedgerBTCNetworkWallet(masterWallet as LedgerMasterWallet, this);
      default:
        Logger.warn('wallet', 'BTC does not support ', masterWallet.type);
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
    return 'BTC';
  }

  public getMainChainID(): number {
    return -1;
  }

  public supportedWalletCreateTypes(): WalletCreateType[] {
    return [WalletCreateType.MNEMONIC, WalletCreateType.KEYSTORE];
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['BTC'] = {};
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.BTC_LEGACY, PrivateKeyType.BTC_SEGWIT];
  }
}