import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo, SubWalletTransactionProvider } from "../../../providers/transaction.provider";
import { EscSubWallet } from "../esc.evm.subwallet";

export class TokenProvider extends SubWalletTransactionProvider<EscSubWallet, EthTransaction> {
  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: transaction.time,
      subjectKey: transaction.contractAddress
    };
  }

  // All ERC20 transactions fetched at once
  public async fetchTransactions(): Promise<void> {
    await this.prepareTransactions(this.subWallet);

    const tokenAccountAddress = await this.subWallet.createAddress();

    let ethTokenTransactions = await GlobalElastosAPIService.instance.getERC20TokenTransactions(StandardCoinName.ETHSC, tokenAccountAddress);
    if (ethTokenTransactions) {
      /* this.paginatedTransactions.set(this.subWallet.getTransactionsCacheKey(), {
        total: ethTokenTransactions.length,
        transactions: ethTokenTransactions
      }); */
      await this.saveTransactions(ethTokenTransactions);
    }
  }
}