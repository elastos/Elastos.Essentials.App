import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";
import { ArbitrumMainnetUniswapCurrencyProvider } from "./currency/arb.uniswap.currency.provider";
import { arbitrumMainnetElkBridgeProvider } from "./earn/bridge.providers";
import { arbitrumMainnetElkEarnProvider } from "./earn/earn.providers";
import { arbitrumMainnetUniswapSwapProvider } from "./earn/swap.providers";

export class ArbitrumMainNetNetwork extends EVMNetwork {
  private uniswapCurrencyProvider: ArbitrumMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "arbitrum",
      "Arbitrum One",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC, MAINNET_TEMPLATE),
      ArbitrumAPI.getApiUrl(ArbitrumApiType.EXPLORER, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      42161,
      [
        new ERC20Coin("USDT", "USDT", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("BTC", "Wrapped BTC", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", 8, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("SUSHI", "Sushi Token", "0xd4d42f0b6def4ce0383636770ef773390d85c61a", 18, MAINNET_TEMPLATE, false),
        new ERC20Coin("COMP", "Compound", "0x354a6da3fcde098f8389cad84b0182725c6c91de", 18, MAINNET_TEMPLATE, false),
      ],
      [
        arbitrumMainnetElkEarnProvider
      ],
      [
        arbitrumMainnetUniswapSwapProvider,
        arbitrumMainnetUniswapSwapProvider
      ],
      [
        arbitrumMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new ArbitrumMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 15 //;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
