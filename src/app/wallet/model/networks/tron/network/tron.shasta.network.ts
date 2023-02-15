import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { TRC20Coin } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { TronAPI, TronApiType } from "./tron.api";
import { TronNetworkBase } from "./tron.base.network";

export class TronShastaTestNetNetwork extends TronNetworkBase {
  constructor() {
    super("Tron Shasta Testnet",
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
      return TronAPI.getApiUrl(TronApiType.RPC, TESTNET_TEMPLATE);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return TronAPI.getApiUrl(TronApiType.BLOCK_EXPLORER, TESTNET_TEMPLATE);
    else
      throw new Error(`TronNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }

  public getBuiltInTRC20Coins(): TRC20Coin[] {
    return [
        new TRC20Coin(this, "USDT", "Tether USD", "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", 6, false, true),
        ];
  }
}