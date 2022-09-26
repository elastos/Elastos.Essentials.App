import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { HecoMainnetUniswapCurrencyProvider } from "../currency/heco.uniswap.currency.provider";
import { hecoMainnetElkBridgeProvider, hecoMainnetGlideBridgeProvider, hecoMainnetO3BridgeProvider, hecoMainnetShadowTokenBridgeProvider } from "../earn/bridge.providers";
import { hecoMainnetChannelsEarnProvider, hecoMainnetElkEarnProvider, hecoMainnetFildaEarnProvider } from "../earn/earn.providers";
import { hecoMainnetAnyswapSwapProvider, hecoMainnetElkSwapProvider, hecoMainnetMdexSwapProvider, hecoMainnetO3SwapProvider } from "../earn/swap.providers";
import { HecoBaseNetwork } from "./heco.base.network";

export class HECOMainNetNetwork extends HecoBaseNetwork {
  private uniswapCurrencyProvider: HecoMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "heco",
      "Heco",
      "Heco",
      "assets/wallet/networks/hecochain.png",
      "HT",
      "Huobi Token",
      MAINNET_TEMPLATE,
      128,
      [],
      [
        hecoMainnetFildaEarnProvider,
        hecoMainnetElkEarnProvider,
        hecoMainnetChannelsEarnProvider
      ],
      [
        hecoMainnetMdexSwapProvider,
        hecoMainnetO3SwapProvider,
        hecoMainnetAnyswapSwapProvider,
        hecoMainnetElkSwapProvider
      ],
      [
        hecoMainnetO3BridgeProvider,
        hecoMainnetShadowTokenBridgeProvider,
        hecoMainnetGlideBridgeProvider,
        hecoMainnetElkBridgeProvider
      ]
    );

    this.builtInCoins = [
      new ERC20Coin(this, "BTC", "Heco BTC", "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", 18, false, true),
      new ERC20Coin(this, "ELA", "Heco ELA", "0x102A56E6c2452bcee99dF8f61167E3e0f0749dbE", 8, false, true),
      new ERC20Coin(this, "ETH", "Heco ETH", "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", 18, false, true),
      new ERC20Coin(this, "FilDA", "FilDA", "0xe36ffd17b2661eb57144ceaef942d95295e637f0", 18, false, true),
      new ERC20Coin(this, "USDT", "Heco USDT", "0xa71EdC38d189767582C38A3145b5873052c3e47a", 18, false, true),
      new ERC20Coin(this, "USDC", "Heco USDC", "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", 6, false, true),
      new ERC20Coin(this, "DOT", "Heco DOT", "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", 18, false),
    ];

    this.uniswapCurrencyProvider = new HecoMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 5 // 3;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
