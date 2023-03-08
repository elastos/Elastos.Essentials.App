import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { DexScreenerCurrencyProvider } from "../../evms/dexscreener.currencyprovider";
import { KavaMainnetDexScreenerCurrencyProvider } from "../currency/kava.dexscreener.currency.provider";
import { KavaBaseNetwork } from "./kava.base.network";

export class KavaMainNetNetwork extends KavaBaseNetwork {
  private dexScreenerCurrencyProvider: KavaMainnetDexScreenerCurrencyProvider = null;

  constructor() {
    super(
      "kava",
      "Kava EVM Co-Chain",
      "Kava",
      "assets/wallet/networks/kava.svg",
      "KAVA",
      "Kava Token",
      MAINNET_TEMPLATE,
      2222,
      [],
      [
      ],
      [
      ],
      [
      ]
    );

    this.builtInCoins = [
        // new ERC20Coin(this, "USDC", "USDC Coin", "0xfA9343C3897324496A05fC75abeD6bAC29f8A40f", 6, false, true),
    ];

    this.dexScreenerCurrencyProvider = new KavaMainnetDexScreenerCurrencyProvider(this);

    this.averageBlocktime = 5 // 3;
  }

  public getDexScreenerCurrencyProvider(): DexScreenerCurrencyProvider {
    return this.dexScreenerCurrencyProvider;
  }
}
