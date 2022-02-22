import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../wallet.types";
import { WalletCreateType } from "../../walletaccount";
import { BTCNetworkWallet } from "../../wallets/btc/standard/btc.networkwallet";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { MasterWallet, StandardMasterWallet } from "../../wallets/masterwallet";
import { AnyNetworkWallet } from "../../wallets/networkwallet";
import { Network } from "../network";

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
        wallet = new BTCNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      default:
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