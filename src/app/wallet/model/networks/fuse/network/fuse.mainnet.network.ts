import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { FuseMainnetUniswapCurrencyProvider } from "../currency/fuse.uniswap.currency.provider";
import { FuseBaseNetwork } from "./fuse.base.network";

export class FuseMainNetNetwork extends FuseBaseNetwork {
  private uniswapCurrencyProvider: FuseMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "fuse",
      "Fuse",
      "assets/wallet/networks/fuse.png",
      "FUSE",
      "FUSE",
      MAINNET_TEMPLATE,
      122,
    );

    this.uniswapCurrencyProvider = new FuseMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
