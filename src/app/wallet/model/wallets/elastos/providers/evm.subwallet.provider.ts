import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { AnySubWallet } from "../../subwallet";
import { ElastosEVMSubWallet } from "../elastos.evm.subwallet";

const MAX_RESULTS_PER_FETCH = 100; // TODO: increase after dev complete

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

// TODO Remove it (get transactions by misc server)
//   public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
//     if (afterTransaction)
//       throw new Error("fetchTransactions() with afterTransaction: NOT YET IMPLEMENTED");

//     let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForMisc(this.subWallet.id);
//     const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
//     if (rpcApiUrl === null) {
//       return null;
//     }
//     let ethscgethistoryurl = null;
//     // Misc api
//     // const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address '&begBlockNumber=' + begBlockNumber
//     // + '&endBlockNumber=' + endBlockNumber + '&sort=desc';
//     let address = await this.subWallet.createAddress();
//     ethscgethistoryurl = rpcApiUrl + '/api/1/eth/history?address=' + address;
//     Logger.warn('wallet', '----ElastosEvmSubWalletProvider fetchTransactions ', ethscgethistoryurl)
//     try {
//       let result = await GlobalJsonRPCService.instance.httpGet(ethscgethistoryurl);
//       let transactions = result.result as EthTransaction[];

//       // We can't "fetch more". What we get from the api if what we will always have (whole list) - for now.
//       /* let paginatedTransactions: PaginatedTransactions<EthTransaction> = {
//         total: transactions.length,
//         transactions: transactions.reverse()
//       }; */
//       await this.saveTransactions(transactions);

//     } catch (e) {
//       Logger.error('wallet', 'Elastos EVM provider fetchTransactions error:', e)
//     }
//   }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.canFetchMore;
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = await this.subWallet.createAddress();

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

    let txListUrl = accountApiUrl + '/api?module=account';
    txListUrl += '&action=txlist';
    txListUrl += '&page=' + page;
    txListUrl += '&offset=' + MAX_RESULTS_PER_FETCH;
    txListUrl += '&sort=desc';
    txListUrl += '&address=' + accountAddress;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];
      Logger.warn('wallet', '----txListUrl:', txListUrl)
      Logger.warn('wallet', '----transactions:', transactions)
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