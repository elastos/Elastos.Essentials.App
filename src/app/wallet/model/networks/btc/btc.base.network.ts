import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { WalletCreateType } from "../../walletaccount";
import { BTCNetworkWallet } from "../../wallets/btc/btc.networkwallet";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { Network } from "../network";

export abstract class BTCNetworkBase extends Network {

  constructor(
    displayName: string,
    public nodeUrlApi: string,
    explorerUrlApi: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[]) {
    super(
      "btc",
      displayName,
      "assets/wallet/networks/btc.svg",
      earnProviders,
      swapProviders,
      bridgeProviders);
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new BTCNetworkWallet(masterWallet, this);
    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public async createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    return await null;
  }

  public getMainEvmRpcApiUrl(): string {
    return this.nodeUrlApi;
  }

  public getMainTokenSymbol(): string {
    return 'BTC';
  }

  public getMainChainID(): number {
      return -1;
  }

  public supportedWalletCreateTypes(): WalletCreateType[] {
    return [WalletCreateType.MNEMONIC];
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['BTC'] = {};
  }
}