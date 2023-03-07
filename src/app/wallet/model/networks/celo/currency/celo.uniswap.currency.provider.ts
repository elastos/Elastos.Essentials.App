import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";


export class CeloMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "cUSD", "Celo Dollar", "0x765DE816845861e75A25fCA122bb6898B8B1282a", 18, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "CELO", "Celo native asset", "0x471ece3750da237f93b8e339c536989b8978a438", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x62d5b84bE28a183aBB507E125B384122D2C25fAE"; // ubeswap swap factory
  }

  public getFactoryInitCodeHash(): string {
    return "0xb3b8ff62960acea3a88039ebcf80699f15786f1b17cebd82802f7375827a339c"; // ubeswap swap factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}