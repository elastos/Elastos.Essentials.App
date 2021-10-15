import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../uniswap.currencyprovider";

export class EthereumMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDT", "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7", 6, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WETH", "Wrapped ETH", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", 18, MAINNET_TEMPLATE, false, true);

  public getFactoryAddress(): string {
    return "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2 factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"; // Uniswap V2 factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}