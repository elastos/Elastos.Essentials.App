import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

export class AvalancheMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDC", "USDC.e", "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", 6, false, true);

  // Pangolin uses PNG as main token in pairs for swap, not the wrapped native token.
  private wrappedNativeCoin = new ERC20Coin(this.network, "PNG", "PNG", "0x60781C2586D68229fde47564546784ab3fACA982", 18, false, true);
  //private wrappedNativeCoin = new ERC20Coin(this.network, "WAVAX", "Wrapped AVAX", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0xefa94DE7a4656D787667C749f7E1223D71E9FD88"; // Pangolin factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545"; // Pangolin factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}