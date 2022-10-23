import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { BTCAPI, BTCApiType } from "./btc.api";
import { BTCNetworkBase } from "./btc.base.network";

export class BTCMainNetNetwork extends BTCNetworkBase {
  constructor() {
    super("BTC",
      MAINNET_TEMPLATE,
      [
      ],
      [
      ],
      [
      ]
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return BTCAPI.getApiUrl(BTCApiType.NODE, MAINNET_TEMPLATE);
    else if (type === NetworkAPIURLType.EXPLORER)
      return BTCAPI.getApiUrl(BTCApiType.EXPLORER, MAINNET_TEMPLATE);
    else
      throw new Error(`BTCNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }
}