import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

/* 
    const REALM = new Token(chainId, '0x464fdb8affc9bac185a7393fd4298137866dcfb8', 18, 'REALM', 'REALM')
    const TELOS = new Token(chainId, "0xb6c53431608e626ac81a9776ac3e999c5556717c", 18, 'TELOS', 'TELOS');
    const BSC_ETH = new Token(chainId, '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 18, 'BSC_ETH', 'BSC_ETH');
    const ADA = new Token(chainId, '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47', 18, 'ADA', 'Cardano Token');
    const USDT = new Token(chainId, '0x55d398326f99059ff775485246999027b3197955', 18, 'USDT', 'USDT');
    const WBNB = new Token(chainId, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, 'WBNB', 'WBNB');
    const BUSD = new Token(chainId, '0xe9e7cea3dedca5984780bafc599bd69add087d56', 18, 'BUSD', 'BUSD');
 */
export class BscMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDT", "Binance USDT", "0x55d398326f99059ff775485246999027b3197955", 18, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WBNB", "Wrapped BNB", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"; // Pancake swap V2 factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5"; // Pancake swap V2 factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}