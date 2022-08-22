import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { IoTeXBaseNetwork } from "./iotex.base.network";

/**
 * See "mainnet" for more info
 * 
 * Faucet: https://faucet.iotex.io/
 */
export class IoTeXTestNetNetwork extends IoTeXBaseNetwork {
  constructor() {
    super(
      "iotex",
      "IoTeX Testnet",
      "IoTeX Testnet",
      "assets/wallet/networks/iotex.svg",
      "IOTX",
      "IOTX",
      TESTNET_TEMPLATE,
      4690,
      [
        // TODO: built-in tokens
      ],
      [
        // TODO: earn providers
      ],
      [
        // TODO: swap providers
      ],
      [
        // TODO: bridge providers
      ]
    );

    this.averageBlocktime = 5;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }
}
