import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../../evm.types";
import { AnyStandardEVMSubWallet } from "../../wallets/evm.subwallet";
import { AnySubWallet } from "../../wallets/subwallet";
import { EVMSubWalletProvider } from "../evm.subwallet.provider";

const MAX_RESULTS_PER_FETCH = 30;

type FusionTransaction = {
  // TODO
}

export class FusionEvmSubWalletProvider extends EVMSubWalletProvider<AnyStandardEVMSubWallet> {
  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false; // TODO
  }

  // https://github.com/FUSIONFoundation/web3-fusion-extend/tree/master/examples/blockexplorerapi
  // NOTE: Currently fusion explorer api is quite weak our outdated. We are not able to easily get transactions
  // or maybe only the "FROM" transactions. To be tested more.
  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = await this.subWallet.createAddress();

    if (afterTransaction)
      throw new Error("Fusion EVM provider: afterTransaction not yet supported");

    /* let page = 1;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
      }
    } */

    let txListUrl = "http://api.fusionnetwork.io/transactions/";
    txListUrl += accountAddress;
    txListUrl += '?sort=desc';
    //txListUrl += '&page=' + page;
    //txListUrl += '&size=' + MAX_RESULTS_PER_FETCH;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);

      Logger.log("wallet", "DEBUG EVM GET TX FUSION", result);

      let transactions = result.result as FusionTransaction[];

      if (!transactions || transactions.length == 0) {
        return;
      }

      if (transactions.length < MAX_RESULTS_PER_FETCH) {
        // Got less results than expected: we are at the end of what we can fetch. remember this
        // (in memory only)
        // TODO this.canFetchMore = false;
      }

      // TODO await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'FusionEVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}