import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { GlobalJsonRPCService } from './../../../../../services/global.jsonrpc.service';
import { BttcBaseNetwork } from "./bttc.base.network";

export class BttcMainNetNetwork extends BttcBaseNetwork {
  // private uniswapCurrencyProvider: BttcMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "bttc",
      "BTTC",
      "BTTC",
      "assets/wallet/networks/bittorrent.svg",
      "BTT",
      "BTTC Coin",
      MAINNET_TEMPLATE,
      199,
    );

    // this.uniswapCurrencyProvider = new BttcMainnetUniswapCurrencyProvider(this);

    this.averageBlocktime = 5;

    // Register a limitator to limit api requests speed on Celo> Mostly because of the free API key
    // rate limitation of CELOSCAN: there is a rate limit of 5 calls per sec/IP.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }
}
