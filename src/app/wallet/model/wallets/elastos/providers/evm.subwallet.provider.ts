import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { AnySubWallet } from "../../subwallet";
import { ElastosEVMSubWallet } from "../elastos.evm.subwallet";

// ESC, EID
export class ElastosEvmSubWalletProvider extends SubWalletTransactionProvider<ElastosEVMSubWallet, EthTransaction> {
  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + this.subWallet.id + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: this.subWallet.id
    };
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    if (afterTransaction)
      throw new Error("fetchTransactions() with afterTransaction: NOT YET IMPLEMENTED");

    await this.prepareTransactions(this.subWallet);

    let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForMisc(this.subWallet.id);
    const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
    if (rpcApiUrl === null) {
      return null;
    }
    let ethscgethistoryurl = null;
    // Misc api
    // const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address '&begBlockNumber=' + begBlockNumber
    // + '&endBlockNumber=' + endBlockNumber + '&sort=desc';
    let address = await this.subWallet.createAddress();
    ethscgethistoryurl = rpcApiUrl + '/api/1/eth/history?address=' + address;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(ethscgethistoryurl);
      let transactions = result.result as EthTransaction[];

      // We can't "fetch more". What we get from the api if what we will always have (whole list) - for now.
      /* let paginatedTransactions: PaginatedTransactions<EthTransaction> = {
        total: transactions.length,
        transactions: transactions.reverse()
      }; */
      await this.saveTransactions(transactions);

    } catch (e) {
      Logger.error('wallet', 'Elastos EVM provider fetchTransactions error:', e)
    }
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return true; //TODO
  }
}