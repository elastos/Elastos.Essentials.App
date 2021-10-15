import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../uniswap.currencyprovider";

export class ElastosMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDC", "USD Coin on Elastos", "0xa06be0f5950781ce28d965e5efc6996e88a8c141", 6, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WELA", "Wrapped ELA", "0x517e9e5d46c1ea8ab6f78677d6114ef47f71f6c4", 18, MAINNET_TEMPLATE, false, true);

  public getFactoryAddress(): string {
    return "0xad52836ae15ba314915035b22adf31a8a47d0626"; // Glide Finance factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x0c48b1f41153fe6d5b587df2b75975db915806865521ab360cd34590c69de66a"; // Glide Finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}