import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { BitcoinAddressType } from "../../../btc.types";
import { CoinID, StandardCoinName } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import { LedgerAccountType } from "../../../ledger.types";
import type { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { BTCWalletNetworkOptions, PrivateKeyType, WalletType } from "../../../masterwallets/wallet.types";
import { WalletCreateType } from "../../../walletaccount";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import type { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { Network } from "../../network";

export abstract class BTCNetworkBase extends Network<BTCWalletNetworkOptions> {
  public static networkKey = "btc";
  private bitcoinAddressType: BitcoinAddressType = null

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
      StandardCoinName.BTC,
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders);
  }

  public getDefaultWalletNetworkOptions(): BTCWalletNetworkOptions {
    return {
      network: this.key,
      bitcoinAddressType: BitcoinAddressType.Legacy
    }
  }

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    let bitcoinAddressType = this.bitcoinAddressType
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        if (!bitcoinAddressType) {
          // Get btc address type from masterWallet.networkOptions
          bitcoinAddressType = (masterWallet as StandardMasterWallet).getBitcoinAddressType();
        }
        const StandardBTCNetworkWallet = (await import("../networkwallets/standard/standard.btc.networkwallet")).StandardBTCNetworkWallet;
        return new StandardBTCNetworkWallet(masterWallet as StandardMasterWallet, this, bitcoinAddressType);
      case WalletType.LEDGER:
        // The address and derivePath are saved in masterWallet.accountOptions.
        // Ledger wallet currently does not support switching address types.
        const LedgerBTCNetworkWallet = (await import("../networkwallets/ledger/ledger.btc.networkwallet")).LedgerBTCNetworkWallet;

        // TODO: save to masterWallet.networkOptions ?
        let option = (<LedgerMasterWallet>masterWallet).accountOptions.find((option) => {
          return option.type === LedgerAccountType.BTC
        })
        if (option.accountPath.startsWith("84'")) {
          bitcoinAddressType = BitcoinAddressType.NativeSegwit;
        } else if (option.accountPath.startsWith("86'")) {
          bitcoinAddressType = BitcoinAddressType.Taproot;
        }
        return new LedgerBTCNetworkWallet(masterWallet as LedgerMasterWallet, this, bitcoinAddressType);
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

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['BTC'] = {};
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.BTC_LEGACY, PrivateKeyType.BTC_SEGWIT];
  }

  public getMainColor(): string {
    return "ffad4a";
  }

  // To temporarily create networkwallets for all BTC address types on the asset overview page
  // BTC supports three address types. Currently, we need to create a networkwallet separately to obtain the balance.
  public setBitcoinAddressType(type: BitcoinAddressType) {
    this.bitcoinAddressType = type;
  }
}