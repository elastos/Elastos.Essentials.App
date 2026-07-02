import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

/**
 * USD price discovery for Base via Uniswap V2 (deployed on Base).
 * factory + initCodeHash were verified EMPIRICALLY on-chain: the CREATE2-derived
 * pair address reproduced the real on-chain getPair(WETH, USDC). Do NOT swap these
 * for Aerodrome (Solidly-style, not V2 CREATE2-compatible).
 */
export class BaseChainMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WETH", "Wrapped ETH", "0x4200000000000000000000000000000000000006", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6"; // Uniswap V2 factory (Base)
  }

  public getFactoryInitCodeHash(): string {
    return "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"; // Uniswap V2 pair init code hash (verified vs on-chain getPair)
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}
