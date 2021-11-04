import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { PolygonMainnetUniswapCurrencyProvider } from "./currency/polygon.uniswap.currency.provider";
import { polygonMainnetElkBridgeProvider } from "./earn/bridge.providers";
import { polygonMainnetElkEarnProvider } from "./earn/earn.providers";
import { polygonMainnetElkSwapProvider } from "./earn/swap.providers";
import { PolygonAPI, PolygonAPIType } from "./polygon.api";

export class PolygonMainNetNetwork extends EVMNetwork {
  private uniswapCurrencyProvider: PolygonMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "polygon",
      "Polygon",
      "assets/wallet/networks/polygon.png",
      "MATIC",
      "Polygon Coin",
      PolygonAPI.getApiUrl(PolygonAPIType.RPC, MAINNET_TEMPLATE),
      PolygonAPI.getApiUrl(PolygonAPIType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      137,
      [
        new ERC20Coin("USDT", "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("BNB", "Binance Coin", "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("LINK", "ChainLink", "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("UNI", "Uniswap", "0xb33eaad8d922b1083446dc23f610c2567fb5180f", 18, MAINNET_TEMPLATE, false, true),
      ],
      [
        polygonMainnetElkEarnProvider
      ],
      [
        polygonMainnetElkSwapProvider
      ],
      [
        polygonMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new PolygonMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5 // 2;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
