import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

// https://cronoscan.com/address/0xd590cc180601aecd6eeadd9b7f2b7611519544f4#readContract
// https://dexscreener.com/cronos/mmfinance
// https://mmfinance.gitbook.io/docs/smart-contracts/smart-contracts
export class CronosMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDT", "USDT on Cronos", "0x66e428c3f67a68878562e79A0234c1F83c208770", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WCRO", "Wrapped CRO", "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0xd590cC180601AEcD6eeADD9B7f2B7611519544f4"; // MM finance factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x7ae6954210575e79ea2402d23bc6a59c4146a6e6296118aa8b99c747afec8acf"; // MM finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}