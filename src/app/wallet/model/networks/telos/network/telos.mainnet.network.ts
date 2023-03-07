import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { TelosMainnetUniswapCurrencyProvider } from "../currency/telos.uniswap.currency.provider";
import { telosMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { telosMainnetElkSwapProvider } from "../earn/swap.providers";
import { TelosBaseNetwork } from "./telos.base.network";

export class TelosMainNetNetwork extends TelosBaseNetwork {
  private uniswapCurrencyProvider: TelosMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "telos",
      "Telos EVM",
      "Telos EVM",
      "assets/wallet/networks/telos.png",
      "TLOS",
      "Telos",
      MAINNET_TEMPLATE,
      40,
      [
      ],
      [],
      [
        telosMainnetElkSwapProvider
      ],
      [
        telosMainnetElkBridgeProvider
      ]
    );

    // this.builtInCoins = [
    //     new ERC20Coin(this, "ETH", "Telos ETH", "0xfa9343c3897324496a05fc75abed6bac29f8a40f", 18, false, true),
    //     new ERC20Coin(this, "USDT", "Tether USD", "0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73", 6, false, true)
    // ];

    this.uniswapCurrencyProvider = new TelosMainnetUniswapCurrencyProvider(this);

    this.averageBlocktime = 5 // 2;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
