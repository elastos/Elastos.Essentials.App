import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../../../coin";
import { UniswapCurrencyProvider } from "../../../../evms/uniswap.currencyprovider";

export class ElastosMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDC", "USD Coin on Elastos", "0xa06be0f5950781ce28d965e5efc6996e88a8c141", 6, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WELA", "Wrapped ELA", "0x517e9e5d46c1ea8ab6f78677d6114ef47f71f6c4", 18, MAINNET_TEMPLATE, false, true);

  public getFactoryAddress(): string {
    return "0xaAbe38153b25f0d4b2bDa620f67059B3a45334e5"; // Glide Finance factory
  }

  public getFactoryInitCodeHash(): string {
    return "0xec67b2700fcbc06d227dbd9b65a9fe8962750aaf96eadc6caf4b94d8d60c1da5"; // Glide Finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}