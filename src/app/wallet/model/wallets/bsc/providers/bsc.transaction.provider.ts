import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { AnySubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { AnySubWallet } from "../../subwallet";
import { BscERC20SubWallet } from "../bsc.erc20.subwallet";
import { BscChainSubWallet } from "../bsc.subwallet";
import { BSCSubWalletProvider } from "./bscchain.subwallet.provider";
import { BscTokenSubWalletProvider } from "./bsctoken.subwallet.provider";

export class BSCTransactionProvider extends TransactionProvider<EthTransaction> {
  private mainSubWallet: BscChainSubWallet = null;
  private mainProvider: BSCSubWalletProvider = null;
  private tokenProvider: BscTokenSubWalletProvider = null;

  public async start() {
    this.mainSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHHECO) as BscChainSubWallet;

    this.mainProvider = new BSCSubWalletProvider(this, this.mainSubWallet);
    await this.mainProvider.initialize();

    this.tokenProvider = new BscTokenSubWalletProvider(this, this.mainSubWallet);
    await this.tokenProvider.initialize();

    //this.refreshEvery(() => this.mainProvider.fetchTransactions(), 30000);

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    //this.refreshEvery(() => this.tokenProvider.fetchAllTokensTransactions(), 30000);
  }

  public stop(): Promise<void> {
    return;
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof BscChainSubWallet)
      return this.mainProvider;
    else if (subWallet instanceof BscERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("BSC transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }
}