import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../evm.types";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { TransactionProvider } from "./transaction.provider";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { SubWalletTransactionProvider } from "./subwallet.provider";

/**
 * Root class for all EVM compatible chains, as they use the same endpoints to get the list
 * of transactions.
 */
export abstract class EVMSubWalletProvider<SubWalletType extends AnySubWallet> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
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
    throw new Error("canFetchMoreTransactions(): Method not implemented.");
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    if (afterTransaction)
      throw new Error("fetchTransactions() with afterTransaction: NOT YET IMPLEMENTED");

    await this.prepareTransactions(this.subWallet);

    const accountAddress = await this.subWallet.createAddress();

    let maxResults = 8;
    let txListUrl = this.rpcApiUrl + '/api?module=account&action=txlist&page=1&offset='+maxResults+'&sort=desc&address=' + accountAddress;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];

      console.log("DEBUG fetchTransactions fetched",transactions.length,"entries");

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'EVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}