import { Logger } from "src/app/logger";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../../evms/evm.types";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { FusionHelper } from "./fusion.helper";

const MAX_RESULTS_PER_FETCH = 30;

export class FusionEvmSubWalletProvider extends EtherscanEVMSubWalletProvider<AnyMainCoinEVMSubWallet> {
  // https://github.com/FUSIONFoundation/web3-fusion-extend/tree/master/examples/blockexplorerapi
  // NOTE: Currently fusion explorer api is quite weak our outdated. We are not able to easily get transactions
  // or maybe only the "FROM" transactions. To be tested more.
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

    try {
      let { transactions, canFetchMore } = await FusionHelper.fetchTransactions(
        this.subWallet,
        accountAddress,
        page,
        MAX_RESULTS_PER_FETCH);

      this.canFetchMore = canFetchMore;

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'FusionEVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}
