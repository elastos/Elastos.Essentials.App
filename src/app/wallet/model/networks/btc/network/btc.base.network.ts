import { Logger } from "src/app/logger";
import { SPVNetworkConfig } from "../../../../services/wallet.service";
import { CoinID } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../../masterwallets/wallet.types";
import { WalletCreateType } from "../../../walletaccount";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { Network } from "../../network";
import { LedgerBTCNetworkWallet } from "../networkwallets/ledger/ledger.btc.networkwallet";
import { StandardBTCNetworkWallet } from "../networkwallets/standard/standard.btc.networkwallet";

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

  public newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new StandardBTCNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
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