import { Logger } from "src/app/logger";
import { BTCTransaction } from "../../../btc.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { ElastosTransaction } from "../../../providers/transaction.types";
import { AnySubWallet, SubWallet } from "../../subwallet";

export class BTCSubWalletProvider<SubWalletType extends SubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, ElastosTransaction> {
  private MAX_RESULTS_PER_FETCH = 50;

  protected canFetchMore = true;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
    super(provider, subWallet);
  }

  protected getProviderTransactionInfo(transaction: ElastosTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.getTransactionsCacheKey(),
      cacheEntryKey: transaction.txid,
      cacheTimeValue: transaction.time,
      subjectKey: this.subWallet.id
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.canFetchMore;
  }

  /**
   * Call this when import a new wallet or get the latest transactions.
   * @param timestamp get the transactions after the timestamp
   * @returns
   */
   public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: BTCTransaction): Promise<void> {
    Logger.warn('wallet', ' BTC fetchTransactions subWallet:', subWallet);

    const accountAddress = await this.subWallet.createAddress();
    Logger.warn('wallet', ' BTC fetchTransactions:', accountAddress);
    // let page = 1;
    // // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    // if (afterTransaction) {
    //   let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.hash === afterTransaction.hash);
    //   if (afterTransactionIndex) { // Just in case, should always be true but...
    //     // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
    //     // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
    //     page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
    //   }
    // }

    // let txListUrl = this.accountApiUrl + '?module=account';
    // txListUrl += '&action=txlist';
    // txListUrl += '&page=' + page;
    // txListUrl += '&offset=' + MAX_RESULTS_PER_FETCH;
    // txListUrl += '&sort=desc';
    // txListUrl += '&address=' + accountAddress;

    // try {
    //   // Logger.warn('wallet', 'fetchTransactions txListUrl:', txListUrl)
    //   let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
    //   let transactions = result.result as EthTransaction[];
    //   if (!(transactions instanceof Array)) {
    //     Logger.warn('wallet', 'fetchTransactions invalid transactions:', transactions)
    //     return null;
    //   }
    //   if (transactions.length < MAX_RESULTS_PER_FETCH) {
    //     // Got less results than expected: we are at the end of what we can fetch. remember this
    //     // (in memory only)
    //     this.canFetchMore = false;
    //   }

    //   await this.saveTransactions(transactions);
    // } catch (e) {
    //   Logger.error('wallet', 'EVMSubWalletProvider fetchTransactions error:', e)
    // }
    return null;
  }
}