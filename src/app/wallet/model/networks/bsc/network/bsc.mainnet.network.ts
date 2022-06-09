import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { BscMainnetUniswapCurrencyProvider } from "../currency/bsc.uniswap.currency.provider";
import { bscMainnetBinanceBridgeProvider, bscMainnetElkBridgeProvider, bscMainnetShadowTokenBridgeProvider } from "../earn/bridge.providers";
import { bscMainnetElkEarnProvider } from "../earn/earn.providers";
import { bscMainnetElkSwapProvider, bscMainnetMdexSwapProvider } from "../earn/swap.providers";
import { GlobalJsonRPCService } from './../../../../../services/global.jsonrpc.service';
import { BSCBaseNetwork } from "./bsc.base.network";

export class BSCMainNetNetwork extends BSCBaseNetwork {
  private uniswapCurrencyProvider: BscMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "bsc",
      "BSC",
      "assets/wallet/networks/bscchain.png",
      "BNB",
      "Binance Coin",
      MAINNET_TEMPLATE,
      56,
      [
        new ERC20Coin("ETH", "Binance ETH", "0x2170ed0880ac9a755fd29b2688956bd959f933f8", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("ADA", "Binance ADA", "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", 18, MAINNET_TEMPLATE, false),
        new ERC20Coin("USDT", "Binance USDT", "0x55d398326f99059ff775485246999027b3197955", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("BUSD", "Binance USD", "0xe9e7cea3dedca5984780bafc599bd69add087d56", 18, MAINNET_TEMPLATE, false, true)
      ],
      [
        bscMainnetElkEarnProvider
      ],
      [
        bscMainnetMdexSwapProvider,
        bscMainnetElkSwapProvider
      ],
      [
        bscMainnetBinanceBridgeProvider,
        bscMainnetShadowTokenBridgeProvider,
        bscMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new BscMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5 // 3;

    // Register a limitator to limit api requests speed on BSC> Mostly because of the free API key
    // rate limitation of BSCSCAN: max 5 request per IP per second on the free tier.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
