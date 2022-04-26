import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { HooMainnetUniswapCurrencyProvider } from "../currency/hoo.uniswap.currency.provider";
import { HooBaseNetwork } from "./hoo.base.network";

// https://github.com/Pudding-Finance/Pudding-Farm/
export class HooMainNetNetwork extends HooBaseNetwork {
  private uniswapCurrencyProvider: HooMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "hoosmartchain",
      "Hoo smart chain",
      "assets/wallet/networks/hoo.png",
      "HOO",
      "HOO",
      MAINNET_TEMPLATE,
      70,
    );

    this.uniswapCurrencyProvider = new HooMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
