import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { GnosisMainnetUniswapCurrencyProvider } from "../currency/gnosis.uniswap.currency.provider";
import { GnosisBaseNetwork } from "./gnosis.base.network";

export class GnosisMainNetNetwork extends GnosisBaseNetwork {
  private uniswapCurrencyProvider: GnosisMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "gnosis",
      "Gnosis",
      "Gnosis",
      "assets/wallet/networks/gnosis.png",
      "xDAI",
      "xDAI",
      MAINNET_TEMPLATE,
      100,
    );

    this.uniswapCurrencyProvider = new GnosisMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 5;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
