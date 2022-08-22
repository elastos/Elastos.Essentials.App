import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { AnyNetwork } from "../../network";

// https://docs.voltage.finance/contracts
// https://explorer.fuse.io/address/0x1998E4b0F1F922367d8Ec20600ea2b86df55f34E/read-contract
export class FuseMainnetUniswapCurrencyProvider extends UniswapCurrencyProvider {
  private referenceUSDCoin = new ERC20Coin(this.network, "USDC", "USDC Coin on Fuse", "0x620fd5fa44BE6af63715Ef4E65DDFA0387aD13F5", 6, false, true);
  private wrappedNativeCoin = new ERC20Coin(this.network, "WFUSE", "Wrapped FUSE", "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629", 18, false, true);

  constructor(private network: AnyNetwork) {
    super();
  }

  public getFactoryAddress(): string {
    return "0x1998E4b0F1F922367d8Ec20600ea2b86df55f34E"; // Voltage finance factory
  }

  public getFactoryInitCodeHash(): string {
    return "0xe5f5532292e2e2a7aee3c2bb13e6d26dca6e8cc0a843ddd6f37c436c23cfab22"; // Voltage finance factory init code hash
  }

  public getReferenceUSDCoin(): ERC20Coin {
    return this.referenceUSDCoin;
  }

  public getWrappedNativeCoin(): ERC20Coin {
    return this.wrappedNativeCoin;
  }
}