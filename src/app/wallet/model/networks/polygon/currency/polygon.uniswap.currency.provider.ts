import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

export class PolygonMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin: ERC20Coin;
  private wrappedNativeCoin: ERC20Coin;

  constructor(network: AnyNetwork) {
    super();

    this.referenceUSDCoin = new ERC20Coin(network, "USDT", "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6, false, true);
    this.wrappedNativeCoin = new ERC20Coin(network, "WMATIC", "Wrapped MATIC", "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", 18, false, true);
  }

  public getFactoryAddress(): string {
    return "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"; // Sushiswap factory
  }

  public getFactoryInitCodeHash(): string {
    return "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303"; // Sushiswap factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}