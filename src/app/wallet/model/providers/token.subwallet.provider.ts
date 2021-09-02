import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../evm.types";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { StandardEVMSubWallet } from "../wallets/evm.subwallet";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { TransactionProvider } from "./transaction.provider";
import { SubWalletTransactionProvider } from "./subwallet.provider";

/**
 * Root class for all EVM compatible chains to handle ERC20 tokens, as they use the same endpoints to get the list
 * of transactions.
 */
export abstract class EVMSubWalletTokenProvider<SubWalletType extends StandardEVMSubWallet<EthTransaction>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
    super(provider, subWallet);
  }

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: transaction.contractAddress
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    throw new Error("canFetchMoreTransactions(): Method not implemented.");
  }

  public async fetchTransactions(erc20SubWallet: ERC20SubWallet): Promise<void> {
    await this.prepareTransactions(this.subWallet);

    const contractAddress = erc20SubWallet.coin.getContractAddress().toLowerCase();
    const accountAddress = await this.subWallet.createAddress();
    let txListUrl = this.rpcApiUrl + '/api?module=account&action=txlist&contractaddress=' + contractAddress
            + '&address=' + accountAddress + '&sort=desc';
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];
      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'EVMSubWalletTokenProvider fetchTransactions error:', e)
    }
  }
}