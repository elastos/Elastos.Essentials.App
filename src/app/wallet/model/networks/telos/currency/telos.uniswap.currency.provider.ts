import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

// https://apeswap.gitbook.io/apeswap-finance/where-dev/smart-contracts";
export class TelosMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDT", "Tether USD", "0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WTLOS", "Wrapped TLOS", "0xd102ce6a4db07d247fcc28f366a623df0938ca9e", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x411172Dfcd5f68307656A1ff35520841C2F7fAec"; // apeswap swap factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x7d4b9bb0d5808344c0184aada7d10aae8f6b0cc8ceb5eba8dd084f63b8c32099"; // apeswap swap factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}