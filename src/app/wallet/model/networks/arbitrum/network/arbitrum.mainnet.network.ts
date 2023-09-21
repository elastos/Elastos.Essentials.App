import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { ArbitrumMainnetUniswapCurrencyProvider } from "../currency/arb.uniswap.currency.provider";
import { arbitrumMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { arbitrumMainnetElkEarnProvider } from "../earn/earn.providers";
import { arbitrumMainnetElkSwapProvider, arbitrumMainnetUniswapSwapProvider } from "../earn/swap.providers";
import { ArbitrumBaseNetwork } from "./arbitrum.base.network";

export class ArbitrumMainNetNetwork extends ArbitrumBaseNetwork {
  private uniswapCurrencyProvider: ArbitrumMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "arbitrum",
      "Arbitrum One",
      "Arbitrum",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      MAINNET_TEMPLATE,
      42161,
      [],
      [
        arbitrumMainnetElkEarnProvider
      ],
      [
        arbitrumMainnetUniswapSwapProvider,
        arbitrumMainnetElkSwapProvider
      ],
      [
        arbitrumMainnetElkBridgeProvider
      ]
    );

    this.builtInCoins = [
      new ERC20Coin(this, "USDT", "USDT", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 6, false, true),
      new ERC20Coin(this, "USDC", "USDC", "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", 6, false, true),
      new ERC20Coin(this, "BTC", "Wrapped BTC", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", 8, false, true),
      new ERC20Coin(this, "CREDA", "CreDA Protocol Token", "0xc136E6B376a9946B156db1ED3A34b08AFdAeD76d", 18, false, true),
      new ERC20Coin(this, "SUSHI", "Sushi Token", "0xd4d42f0b6def4ce0383636770ef773390d85c61a", 18, false),
      new ERC20Coin(this, "COMP", "Compound", "0x354a6da3fcde098f8389cad84b0182725c6c91de", 18, false)
    ];

    this.uniswapCurrencyProvider = new ArbitrumMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 15 //;

    // Register a limitator to limit api requests speed. Mostly because of the free API key
    // rate limitation of Arbiscan: max 5 request per IP per second on the free tier.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
