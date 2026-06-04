import { StandardCoinName } from "../../../../../coin";
import { AnySubWalletTransactionProvider } from "../../../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { ElastosTransaction } from "../../../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { AnyMainCoinEVMSubWallet } from "../../../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { PGPERC20SubWallet } from "../subwallets/pgp.erc20.subwallet";
import { PGPSubWallet } from "../subwallets/pgp.evm.subwallet";
import { PGPSubWalletProvider } from "./pgp.subwallet.provider";
import { ElastosTokenSubWalletProvider } from "./token.subwallet.provider";

export class ElastosPGPChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaPGPSubWallet: PGPSubWallet;

  private elaPGPProvider: PGPSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;

  private internalTXProvider: EtherscanEVMSubWalletInternalTransactionProvider<AnyMainCoinEVMSubWallet> = null;

  public async start(): Promise<void> {
    super.start()

    this.elaPGPSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHECOPGP) as PGPSubWallet;

    if (this.elaPGPSubWallet) {
      this.elaPGPProvider = new PGPSubWalletProvider(this, this.elaPGPSubWallet);
      await this.elaPGPProvider.initialize();

      this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.elaPGPSubWallet);
      await this.tokenProvider.initialize();

      this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, this.elaPGPSubWallet);
      await this.internalTXProvider.initialize();

      // Discover new transactions globally for all tokens at once, in order to notify user
      // of NEW tokens received, and NEW payments received for existing tokens.
      this.refreshEvery(() => this.tokenProvider.discoverTokens(), 60000);
    }
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof PGPSubWallet) return this.elaPGPProvider;
    else if (subWallet instanceof PGPERC20SubWallet) return this.tokenProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: PGPSubWallet): AnySubWalletTransactionProvider {
    return this.internalTXProvider;
  }
}