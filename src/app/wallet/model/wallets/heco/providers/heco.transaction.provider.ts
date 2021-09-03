import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { AnySubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { AnySubWallet } from "../../subwallet";
import { HecoERC20SubWallet } from "../heco.erc20.subwallet";
import { HECOChainSubWallet } from "../heco.subwallet";
import { HecoChainSubWalletProvider } from "./hecochain.subwallet.provider";
import { HecoTokenSubWalletProvider } from "./hecotoken.subwallet.provider";

export class HecoTransactionProvider extends TransactionProvider<EthTransaction> {
  private mainSubWallet: HECOChainSubWallet = null;
  private mainProvider: HecoChainSubWalletProvider = null;
  private tokenProvider: HecoTokenSubWalletProvider = null;

  public async start() {
    this.mainSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHHECO) as HECOChainSubWallet;

    this.mainProvider = new HecoChainSubWalletProvider(this, this.mainSubWallet);
    await this.mainProvider.initialize();

    this.tokenProvider = new HecoTokenSubWalletProvider(this, this.mainSubWallet);
    await this.tokenProvider.initialize();

    //this.refreshEvery(() => this.mainProvider.fetchTransactions(), 30000);

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    this.refreshEvery(() => this.tokenProvider.fetchAllTokensTransactions(), 30000);
  }

  public stop(): Promise<void> {
    return;
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof HECOChainSubWallet)
      return this.mainProvider;
    else if (subWallet instanceof HecoERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Heco transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }
}