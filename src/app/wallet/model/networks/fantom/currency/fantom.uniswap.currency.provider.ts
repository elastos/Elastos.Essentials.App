import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../uniswap.currencyprovider";

export class FantomMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDC", "USDC", "0x04068da6c83afcfa0e13ba15a6696662335d5b75", 6, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WFTM", "Wrapped FTM", "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83", 18, MAINNET_TEMPLATE, false, true);

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