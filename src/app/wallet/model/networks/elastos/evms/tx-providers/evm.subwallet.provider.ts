import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { ProviderTransactionInfo } from "../../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../../tx-providers/subwallet.provider";
import { AnySubWallet } from "../../../base/subwallets/subwallet";
import { EthTransaction } from "../../../evms/evm.types";
import { ElastosEVMSubWallet } from "../subwallets/standard/elastos.evm.subwallet";

const MAX_RESULTS_PER_FETCH = 30

// ESC, EID
export class ElastosEvmSubWalletProvider extends SubWalletTransactionProvider<ElastosEVMSubWallet, EthTransaction> {
  private canFetchMore = true;

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
    const accountAddress = this.subWallet.getCurrentReceiverAddress();

    let page = 1;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
      }
    }

    let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(this.subWallet.id);
    const accountApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);

    let txListUrl = accountApiUrl + '?module=account';
    txListUrl += '&action=txlist';
    txListUrl += '&page=' + page;
    txListUrl += '&offset=' + MAX_RESULTS_PER_FETCH;
    txListUrl += '&sort=desc';
    txListUrl += '&address=' + accountAddress;
    // Some scan apis such as hecoinfo need start and end block to be defined. So far, using a large block scope doesn't seem to be an issue,
    // but this could change in the future for other chains or for heco itself... in which case we may have to fetch transactions blocks by blocks.
    txListUrl += '&startblock=' + 0;
    txListUrl += '&endblock=' + 1000000000; // Very highe block number fo ensure we get everything

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);
      let transactions = result.result as EthTransaction[];
      if (!(transactions instanceof Array)) {
        Logger.warn('wallet', 'fetchTransactions invalid transactions:', transactions)
        return null;
      }
      if (transactions.length < MAX_RESULTS_PER_FETCH) {
        // Got less results than expected: we are at the end of what we can fetch. remember this
        // (in memory only)
        this.canFetchMore = false;
      }

      // Logger.log('wallet', "ESC transactions", transactions)

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'ElastosEvmSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}