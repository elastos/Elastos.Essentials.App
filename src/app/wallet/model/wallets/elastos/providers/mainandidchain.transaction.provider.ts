import { ProviderTransactionInfo, SubWalletTransactionProvider } from "../../../providers/transaction.provider";
import { ElastosTransaction } from "../../../providers/transaction.types";
import { SubWallet } from "../../subwallet";

export abstract class MainAndDIDChainProvider<SubWalletType extends SubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, ElastosTransaction> {

  protected getProviderTransactionInfo(transaction: ElastosTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.getTransactionsCacheKey(),
      cacheEntryKey: transaction.txid,
      cacheTimeValue: transaction.time,
      subjectKey: this.subWallet.id
    };
  }

  /* public getTransactions(startIndex = 0): ElastosPaginatedTransactions {
    if (this.paginatedTransactions == null) {
      await this.getTransactionsByRpc();
      this.loadTxDataFromCache = false;
    } else {
      this.loadTxDataFromCache = true;
    }

    if (this.paginatedTransactions) {
      if ((startIndex + 20 > this.paginatedTransactions.txhistory.length) && (this.needtoLoadMoreAddresses.length > 0)) {
        await this.getMoreTransactionByRPC(++this.loadMoreTimes);
      }

      // For performance, only return 20 transactions.
      let newTxList: ElastosPaginatedTransactions = {
        totalcount: this.paginatedTransactions.totalcount,
        txhistory: this.paginatedTransactions.txhistory.slice(startIndex, startIndex + 20),
      }
      return newTxList;
    }
    else {
      return null;
    }
  } */
}