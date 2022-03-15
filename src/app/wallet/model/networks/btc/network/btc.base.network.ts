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

  constructor(
    displayName: string,
    public nodeUrlApi: string,
    explorerUrlApi: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[]) {
    super(
      "btc",
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

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new StandardBTCNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      case WalletType.LEDGER:
        wallet = new LedgerBTCNetworkWallet(masterWallet as LedgerMasterWallet, this);
        break;
      default:
        Logger.warn('wallet', 'BTC does not support ', masterWallet.type);
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  }

  public async createERC20SubWallet(networkWallet: AnyNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    return await null;
  }

  public getMainEvmRpcApiUrl(): string {
    return this.nodeUrlApi;
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