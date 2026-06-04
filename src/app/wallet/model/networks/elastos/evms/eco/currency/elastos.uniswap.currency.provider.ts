import { ERC20Coin } from "../../../../../coin";
import { UniswapCurrencyProvider } from "../../../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../../../network";

export class ElastosECOPGProvider extends UniswapCurrencyProvider {
  private referenceUSDTCoin = new ERC20Coin(this.network, "USDT", "PGA-USDT", "0x1C4E7cd89ea67339d4A5ed2780703180a19757d7", 18, false, true);
  private referenceBTCDCoin = new ERC20Coin(this.network, "BSDT", "BTCD Coin on ECO", "0x45ec25a63e010bfb84629242f40dda187f83833e", 18, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WELA", "Wrapped ELA", "0x289DbD7DD0F5Fea25dbDEA5a248caE4171428CE5", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  private usualSwapCoins = [
    this.referenceBTCDCoin
  ]

  public getFactoryAddress(): string {
    return "0xc384eF56dDB126F88dA44a5c8053AaEa936A22Ba"; // PG Finance factory
  }

  public getRouterAddress(): string {
    return "0x550113962412746ab6024787D2b2c3cB6533c7cB"; // PG Finance router
  }

  public getSwapFees(): number {
    return 0.25;
  }

  public getFactoryInitCodeHash(): string {
    return "0x3b32b7b1f4684b5e2012b4719e40154d329b69933762b01330c49589d58a01a5"; // PG Finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceBTCDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }

  public getUsualSwapCoinsForPairs(): ERC20Coin[] {
    return this.usualSwapCoins;
  }
}