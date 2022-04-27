import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { CronosMainnetUniswapCurrencyProvider } from "../currency/cronos.uniswap.currency.provider";
import { CronosBaseNetwork } from "./cronos.base.network";

export class CronosMainNetNetwork extends CronosBaseNetwork {
  private uniswapCurrencyProvider: CronosMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "cronos",
      "Cronos",
      "assets/wallet/networks/cronos.png",
      "CRO",
      "CRO",
      MAINNET_TEMPLATE,
      25,
    );

    this.uniswapCurrencyProvider = new CronosMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
