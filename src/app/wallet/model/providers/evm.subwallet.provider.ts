import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../evm.types";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { ProviderTransactionInfo, SubWalletTransactionProvider, TransactionProvider } from "./transaction.provider";

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
      cacheTimeValue: transaction.time,
      subjectKey: this.subWallet.id
    };
  }

  public async fetchTransactions(): Promise<void> {
    await this.prepareTransactions(this.subWallet);

    const accountAddress = await this.subWallet.createAddress();

    let maxResults = 20;
    let txListUrl = this.rpcApiUrl + '/api?module=account&action=txlist&&offset='+maxResults+'sort=desc&address=' + accountAddress;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];
      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'EVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}