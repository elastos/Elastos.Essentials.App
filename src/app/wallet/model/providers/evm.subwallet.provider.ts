import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../evm.types";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { TransactionProvider } from "./transaction.provider";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { SubWalletTransactionProvider } from "./subwallet.provider";

const MAX_RESULTS_PER_FETCH = 8; // TODO: increase after dev complete

/**
 * Root class for all EVM compatible chains, as they use the same endpoints to get the list
 * of transactions.
 */
export abstract class EVMSubWalletProvider<SubWalletType extends AnySubWallet> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  private canFetchMore = true;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
    super(provider, subWallet);
  }

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + this.subWallet.id + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: this.subWallet.id
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.canFetchMore;
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    await this.prepareTransactions(this.subWallet);

    const accountAddress = await this.subWallet.createAddress();

    let page = 1;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = this.getTransactions(subWallet).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 1 + Math.floor((afterTransactionIndex+1) / MAX_RESULTS_PER_FETCH);
      }
    }

    let txListUrl = this.rpcApiUrl + '/api?module=account';
    txListUrl += '&action=txlist';
    txListUrl += '&page='+page;
    txListUrl += '&offset='+MAX_RESULTS_PER_FETCH;
    txListUrl += '&sort=desc';
    txListUrl += '&address=' + accountAddress;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];

      if (transactions.length < MAX_RESULTS_PER_FETCH) {
        // Got less results than expected: we are at the end of what we can fetch. remember this
        // (in memory only)
        this.canFetchMore = false;
      }

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'EVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}