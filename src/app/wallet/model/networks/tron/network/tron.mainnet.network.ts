import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { TRC20Coin } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { TronAPI, TronApiType } from "./tron.api";
import { TronNetworkBase } from "./tron.base.network";

export class TronMainNetNetwork extends TronNetworkBase {
  constructor() {
    super("TRON",
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
      return TronAPI.getApiUrl(TronApiType.RPC, MAINNET_TEMPLATE);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return TronAPI.getApiUrl(TronApiType.BLOCK_EXPLORER, MAINNET_TEMPLATE);
    else
      throw new Error(`TronNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }

  public getBuiltInTRC20Coins(): TRC20Coin[] {
    return [
        new TRC20Coin(this, "USDT", "Tether USD", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", 6, false, true),
        ];
  }
}