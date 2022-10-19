import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { BTCAPI, BTCApiType } from "./btc.api";
import { BTCNetworkBase } from "./btc.base.network";

export class BTCTestNetNetwork extends BTCNetworkBase {
  constructor() {
    super("BTC Testnet",
      TESTNET_TEMPLATE,
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
      return BTCAPI.getApiUrl(BTCApiType.NODE, TESTNET_TEMPLATE);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return BTCAPI.getApiUrl(BTCApiType.BLOCK_EXPLORER, TESTNET_TEMPLATE);
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