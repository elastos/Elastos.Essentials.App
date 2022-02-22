import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { WalletType } from "../../wallet.types";
import { AvalancheCChainNetworkWallet } from "../../wallets/avalanchecchain/standard/avalanchecchain.network.wallet";
import { MasterWallet, StandardMasterWallet } from "../../wallets/masterwallet";
import { AnyNetworkWallet } from "../../wallets/networkwallet";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";
import { AvalancheMainnetUniswapCurrencyProvider } from "./currency/avalanche.uniswap.currency.provider";
import { avalancheMainnetElkBridgeProvider } from "./earn/bridge.providers";
import { avalancheMainnetElkEarnProvider } from "./earn/earn.providers";
import { avalancheMainnetElkSwapProvider } from "./earn/swap.providers";

export class AvalancheCChainMainNetNetwork extends EVMNetwork {
  private uniswapCurrencyProvider: AvalancheMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "avalanchecchain",
      "Avalanche C-Chain",
      "assets/wallet/networks/avalance.png",
      "AVAX",
      "Avalanche Token",
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.RPC, MAINNET_TEMPLATE),
      null,
      MAINNET_TEMPLATE,
      43114,
      [],
      [
        avalancheMainnetElkEarnProvider
      ],
      [
        avalancheMainnetElkSwapProvider
      ],
      [
        avalancheMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new AvalancheMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5 // 2;
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new AvalancheCChainNetworkWallet(masterWallet as StandardMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
        break;
      default:
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
