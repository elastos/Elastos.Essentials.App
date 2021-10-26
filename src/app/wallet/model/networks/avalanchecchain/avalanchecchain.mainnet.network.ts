import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AvalancheCChainNetworkWallet } from "../../wallets/avalanchecchain/avalanchecchain.network.wallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";
import { AvalancheMainnetUniswapCurrencyProvider } from "./currency/avalanche.uniswap.currency.provider";

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
    );

    this.uniswapCurrencyProvider = new AvalancheMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5 // 2;
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new AvalancheCChainNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
