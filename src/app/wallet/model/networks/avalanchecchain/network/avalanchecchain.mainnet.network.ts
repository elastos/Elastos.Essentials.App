import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AvalancheMainnetUniswapCurrencyProvider } from "../currency/avalanche.uniswap.currency.provider";
import { avalancheMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { avalancheMainnetElkEarnProvider } from "../earn/earn.providers";
import { avalancheMainnetElkSwapProvider } from "../earn/swap.providers";
import { AvalancheCChainNetworkWallet } from "../networkwallets/standard/avalanchecchain.network.wallet";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";

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
