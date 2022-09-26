import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

export class HooMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDT", "USDT", "0xD16bAbe52980554520F6Da505dF4d1b124c815a7", 6, false, true);
  //private wrappedNativeCoin = new ERC20Coin("PUD", "Pudding", "0xbE8D16084841875a1f398E6C3eC00bBfcbFa571b", 18, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WHOO", "Wrapped HOO", "0x3EFF9D389D13D6352bfB498BCF616EF9b1BEaC87", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x6168D508ad65D87f8F5916986B55d134Af7153bb"; // Pudding Swap factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x80bd44b36fff03b8bb0913a44b51ae0e27c1d42bc4a5dd86a7c9a6a714739241"; // Pudding swap factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}