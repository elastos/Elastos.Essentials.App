import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { CeloMainnetUniswapCurrencyProvider } from "../currency/celo.uniswap.currency.provider";
import { GlobalJsonRPCService } from './../../../../../services/global.jsonrpc.service';
import { CeloBaseNetwork } from "./celo.base.network";

export class CeloMainNetNetwork extends CeloBaseNetwork {
  private uniswapCurrencyProvider: CeloMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "celo",
      "Celo",
      "CELO",
      "assets/wallet/networks/celo.svg",
      "CELO",
      "Celo Coin",
      MAINNET_TEMPLATE,
      42220,
    );

    this.builtInCoins = [
      new ERC20Coin(this, "cUSD", "Celo Dollar", "0x765DE816845861e75A25fCA122bb6898B8B1282a", 18, false, true)
    ];

    this.uniswapCurrencyProvider = new CeloMainnetUniswapCurrencyProvider(this);

    this.averageBlocktime = 5;

    // Register a limitator to limit api requests speed on Celo> Mostly because of the free API key
    // rate limitation of CELOSCAN: there is a rate limit of 5 calls per sec/IP.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
