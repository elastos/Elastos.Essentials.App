import { ERC20Coin } from "../../../coin";
import { DexScreenerCurrencyProvider } from "../../evms/dexscreener.currencyprovider";
import { AnyNetwork } from "../../network";


export class KavaMainnetDexScreenerCurrencyProvider extends DexScreenerCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDC", "USD Coin", "0xfA9343C3897324496A05fC75abeD6bAC29f8A40f", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WKAVA", "Wrapped Kava", "0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}