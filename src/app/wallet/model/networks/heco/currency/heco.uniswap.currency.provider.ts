import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";

export class HecoMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin("USDT", "USDT", "0xa71edc38d189767582c38a3145b5873052c3e47a", 18, MAINNET_TEMPLATE, false, true);
  private wrappedNativeCoin = new ERC20Coin("WHT", "Wrapped HT", "0x5545153ccfca01fbd7dd11c0b23ba694d9509a6f", 18, MAINNET_TEMPLATE, false, true);

  public getFactoryAddress(): string {
    return "0xb0b670fc1F7724119963018DB0BfA86aDb22d941"; // MDEX factory
  }

  public getFactoryInitCodeHash(): string {
    return "0x2ad889f82040abccb2649ea6a874796c1601fb67f91a747a80e08860c73ddf24"; // MDEX factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}