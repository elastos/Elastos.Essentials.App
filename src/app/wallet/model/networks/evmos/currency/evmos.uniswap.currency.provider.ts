import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";


export class EvmosMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "ceUSDC", "USD Coin(Celer)", "0xe46910336479f254723710d57e7b683f3315b22b", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WEVMOS", "Wrapped Evmos", "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x6aBdDa34Fb225be4610a2d153845e09429523Cd2"; // diffusion finance factory
  }

  public getFactoryInitCodeHash(): string {
    return "0xa192c894487128ec7b68781ed7bd7e3141d1718df9e4e051e0124b7671d9a6ef"; // diffusion finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}