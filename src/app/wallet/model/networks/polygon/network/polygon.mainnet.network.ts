import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { PolygonMainnetUniswapCurrencyProvider } from "../currency/polygon.uniswap.currency.provider";
import { polygonMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { polygonMainnetElkEarnProvider } from "../earn/earn.providers";
import { polygonMainnetElkSwapProvider } from "../earn/swap.providers";
import { PolygonBaseNetwork } from "./polygon.base.network";

export class PolygonMainNetNetwork extends PolygonBaseNetwork {
  private uniswapCurrencyProvider: PolygonMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "polygon",
      "Polygon",
      "Polygon",
      "assets/wallet/networks/polygon.png",
      "MATIC",
      "Polygon Coin",
      MAINNET_TEMPLATE,
      137,
      [],
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

    this.builtInCoins = [
      new ERC20Coin(this, "USDT", "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6, false, true),
      new ERC20Coin(this, "BNB", "Binance Coin", "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3", 18, false, true),
      new ERC20Coin(this, "USDC", "USDC", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", 6, false, true),
      new ERC20Coin(this, "LINK", "ChainLink", "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", 18, false, true),
      new ERC20Coin(this, "UNI", "Uniswap", "0xb33eaad8d922b1083446dc23f610c2567fb5180f", 18, false, true),
    ];

    this.uniswapCurrencyProvider = new PolygonMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 5 // 2;

    // Register a limitator to limit api requests speed on polygon> Mostly because of the free API key
    // rate limitation of BSCSCAN: max 5 request per IP per second on the free tier.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
