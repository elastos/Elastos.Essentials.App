import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AtomBaseNetwork } from "./atom.base.network";

export class AtomMainNetNetwork extends AtomBaseNetwork {

  constructor() {
    super(
      "atom",
      "Cosmos Atom Chain",
      "ATOM",
      "assets/wallet/networks/atom.svg",
      "ATOM",
      "Atom Coin",
      MAINNET_TEMPLATE,
      'cosmos',
      "m/44'/118'/0'/0/0",
      [],
      [
      ],
      [
      ],
      [
      ]
    );

    // this.builtInCoins = [
    //   new ERC20Coin(this, "ETH", "Binance ETH", "0x2170ed0880ac9a755fd29b2688956bd959f933f8", 18, false, true),
    //   new ERC20Coin(this, "ADA", "Binance ADA", "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", 18, false),
    //   new ERC20Coin(this, "USDT", "Binance USDT", "0x55d398326f99059ff775485246999027b3197955", 18, false, true),
    //   new ERC20Coin(this, "BUSD", "Binance USD", "0xe9e7cea3dedca5984780bafc599bd69add087d56", 18, false, true)
    // ];

    this.averageBlocktime = 6;

    // Register a limitator to limit api requests speed on BSC> Mostly because of the free API key
    // rate limitation of BSCSCAN: max 5 request per IP per second on the free tier.
    // GlobalJsonRPCService.instance.registerLimitator(this.key, {
    //   minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    // });
  }
}
