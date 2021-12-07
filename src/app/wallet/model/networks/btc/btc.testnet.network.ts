import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { BTCAPI, BTCApiType } from "./btc.api";
import { BTCNetworkBase } from "./btc.base.network";

export class BTCTestNetNetwork extends BTCNetworkBase {
  constructor() {
    super("BTC Testnet",
      BTCAPI.getApiUrl(BTCApiType.NODE, TESTNET_TEMPLATE),
      BTCAPI.getApiUrl(BTCApiType.EXPLORER, TESTNET_TEMPLATE),
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