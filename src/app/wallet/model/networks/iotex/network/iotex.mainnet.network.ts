import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { IoTeXBaseNetwork } from "./iotex.base.network";

/**
 * Explorer: https://iotexscout.io/
 * Doc: https://docs.iotex.io/
 * Analytics: https://docs.iotex.io/reference/analytics
 * Analytics playground: https://analytics.iotexscan.io/
 * GraphQL examples: https://medium.com/iotex/iotex-analytics-playground-is-live-on-analytics-iotexscan-io-10a7355e921b
 * Address conversion: https://docs.iotex.io/basic-concepts/address-conversion - https://member.iotex.io/tools/address-convert
 *
 */
export class IoTeXMainNetNetwork extends IoTeXBaseNetwork {
  constructor() {
    super(
      "iotex",
      "IoTeX",
      "IoTeX",
      "assets/wallet/networks/iotex.svg",
      "IOTX",
      "IOTX",
      MAINNET_TEMPLATE,
      4689,
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
