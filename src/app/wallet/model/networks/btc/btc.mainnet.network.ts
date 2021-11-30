import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { BTCAPI, BTCApiType } from "./btc.api";
import { BTCNetworkBase } from "./btc.base.network";

export class BTCMainNetNetwork extends BTCNetworkBase {
  constructor() {
    super("BTC",
      BTCAPI.getApiUrl(BTCApiType.NODE, MAINNET_TEMPLATE),
      BTCAPI.getApiUrl(BTCApiType.EXPLORER, MAINNET_TEMPLATE),
      [
      ],
      [
      ],
      [
      ]
    );
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }
}