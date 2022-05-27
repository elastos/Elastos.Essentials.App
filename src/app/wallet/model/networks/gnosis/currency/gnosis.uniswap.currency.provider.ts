import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";

export class GnosisMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDC", "USD//C from Ethereum", "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83", 6, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WXDAI", "Wrapped xDAI", "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d", 18, MAINNET_TEMPLATE, false, true);

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