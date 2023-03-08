import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { EvmosMainnetUniswapCurrencyProvider } from "../currency/evmos.uniswap.currency.provider";
import { EvmosBaseNetwork } from "./evmos.base.network";

export class EvmosMainNetNetwork extends EvmosBaseNetwork {
  private uniswapCurrencyProvider: EvmosMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "evmos",
      "Evmos",
      "Evmos",
      "assets/wallet/networks/evmos.png",
      "EVMOS",
      "Evmos Token",
      MAINNET_TEMPLATE,
      9001,
      [],
      [
      ],
      [
      ],
      [
      ]
    );

    this.builtInCoins = [
        // new ERC20Coin(this, "ceUSDC", "USD Coin(Celer)", "0xe46910336479f254723710d57e7b683f3315b22b", 6, false, true)
    ];

    this.uniswapCurrencyProvider = new EvmosMainnetUniswapCurrencyProvider(this);

    this.averageBlocktime = 7;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
