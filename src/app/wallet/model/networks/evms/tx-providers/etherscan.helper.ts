import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../evm.types";

export class EtherscanHelper {
  public static async fetchTokenTransactions(subWallet: AnySubWallet, etherscanApiUrl: string, accountAddress: string, contractAddress: string, page: number, pageSize: number, apiKey?: string): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let txListUrl = etherscanApiUrl + '?module=account';
    txListUrl += '&action=tokentx';
    txListUrl += '&page=' + page;
    txListUrl += '&offset=' + pageSize;
    txListUrl += '&sort=desc';
    txListUrl += '&contractaddress=' + contractAddress;
    txListUrl += '&address=' + accountAddress;

    if (apiKey)
      txListUrl += '&apikey=' + apiKey;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);
      let transactions = result.result as EthTransaction[];

      if (!(transactions instanceof Array)) {
        Logger.warn('wallet', 'fetchTransactions invalid transactions:', transactions)
        return { transactions: null };
      }

      let canFetchMore: boolean;
      if (transactions.length < pageSize) {
        // Got less results than expected: we are at the end of what we can fetch. remember this
        // (in memory only)
        canFetchMore = false;
      } else {
        canFetchMore = true;
      }

      this.mergeTransactions(transactions, accountAddress);

      return { transactions, canFetchMore };
    } catch (e) {
      Logger.error('wallet', 'EVMSubWalletTokenProvider fetchTransactions error:', e);
      return { transactions: null };
    }
  }

  // Merge the transactions that has the same hash. eg. some contract transactions.
  private static mergeTransactions(transactions: EthTransaction[], accountAddress: string) {
    let txhashNeedToMerge = [];
    for (let i = 1; i < transactions.length; i++) {
      if (transactions[i].hash === transactions[i - 1].hash) {
        if (!txhashNeedToMerge[transactions[i].hash]) txhashNeedToMerge.push(transactions[i].hash)
      }
    }

    for (let i = 0; i < txhashNeedToMerge.length; i++) {
      let txWithSameHash = transactions.filter((tx) => {
        return tx.hash === txhashNeedToMerge[i];
      })

      let updateInfo = this.mergeTransactionsWithSameHash(txWithSameHash, accountAddress);
      let updateArray = false;
      // update the first sent transaction and remove the others.
      for (let j = 0; j < transactions.length; j++) {
        if (transactions[j].hash === txhashNeedToMerge[i]) {
          if (!updateArray) {
            let findTxToUpdate = updateInfo.direction === TransactionDirection.SENT ?
              transactions[j].from.toLowerCase() === accountAddress :
              transactions[j].to.toLowerCase() === accountAddress

            if (findTxToUpdate) {
              transactions[j].value = updateInfo.value;
              updateArray = true;
            } else {
              // TODO: the UI will not show this transaction.
              transactions[j].hash += '----' + transactions[j].logIndex;
              transactions[j].hide = true;
            }
          } else {
            // TODO: the UI will not show this transaction.
            transactions[j].hash += '----' + transactions[j].logIndex;
            transactions[j].hide = true;
          }
        }
      }
    }
  }

  private static mergeTransactionsWithSameHash(transactions: EthTransaction[], accountAddress: string) {
    let sendValue = new BigNumber(0), receiveValue = new BigNumber(0);
    for (let i = 0; i < transactions.length; i++) {
      if ((i > 0) && (JSON.stringify(transactions[i-1]) == JSON.stringify(transactions[i]))) {
        // Avoid duplication of transactions returned by the api.
        // eg. Hecp api, 2023.1.18
        continue;
      }

      if (transactions[i].to.toLowerCase() === accountAddress) {
        receiveValue = receiveValue.plus(new BigNumber(transactions[i].value));
      } else {
        sendValue = sendValue.plus(new BigNumber(transactions[i].value));
      }
    }

    let value = '', direction: TransactionDirection = TransactionDirection.SENT;
    if (sendValue.gte(receiveValue)) {
      value = sendValue.minus(receiveValue).toFixed();
    } else {
      value = receiveValue.minus(sendValue).toFixed();
      direction = TransactionDirection.RECEIVED;
    }

    return { value, direction };
  }
}