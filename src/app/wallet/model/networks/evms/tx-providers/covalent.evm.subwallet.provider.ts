import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../evm.types";
import { MainCoinEVMSubWallet } from "../subwallets/evm.subwallet";
import { CovalentHelper } from "./covalent.helper";

const MAX_RESULTS_PER_FETCH = 30;

// Use covalent blockchain data API to get transactions.
export class CovalentEvmSubWalletProvider<SubWalletType extends MainCoinEVMSubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction>  {
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

    let page = 0; // Start with 0;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 0 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
      }
    }

    let { transactions, canFetchMore } = await CovalentHelper.fetchTransactions(
      this.subWallet,
      this.subWallet.networkWallet.network.getMainChainID(),
      accountAddress,
      page,
      MAX_RESULTS_PER_FETCH);

    this.canFetchMore = canFetchMore;

    await this.saveTransactions(transactions);
  }
}
