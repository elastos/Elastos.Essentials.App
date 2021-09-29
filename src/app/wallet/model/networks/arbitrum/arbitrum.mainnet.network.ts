import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";
import { arbitrumMainnetUniswapSwapProvider } from "./earn/swap.providers";

export class ArbitrumMainNetNetwork extends EVMNetwork {
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
        new ERC20Coin("USDT", "USDT", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("UNI", "Uniswap", "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0", MAINNET_TEMPLATE, false),
        new ERC20Coin("LINK", "ChainLink", "0xf97f4df75117a78c1a5a0dbb814af92458539fb4", MAINNET_TEMPLATE, false),
        new ERC20Coin("BTC", "Wrapped BTC", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("GRT", "Graph Token", "0x23a941036ae778ac51ab04cea08ed6e2fe103614", MAINNET_TEMPLATE, false),
        new ERC20Coin("SUSHI", "Suchi Token", "0xd4d42f0b6def4ce0383636770ef773390d85c61a", MAINNET_TEMPLATE, false),
        new ERC20Coin("COMP", "Compound", "0x354a6da3fcde098f8389cad84b0182725c6c91de", MAINNET_TEMPLATE, false),
      ],
      [],
      [
        arbitrumMainnetUniswapSwapProvider
      ],
      []
    );
  }
}
