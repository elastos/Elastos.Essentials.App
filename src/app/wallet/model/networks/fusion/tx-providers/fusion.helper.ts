import BigNumber from "bignumber.js";
import moment from "moment";
import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { Config } from "src/app/wallet/config/Config";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../../evms/evm.types";

export type FusionTransaction = {
  tx_hash: string;
  tx_status: boolean;
  tx_method: string;
  block_height: number;
  tx_idx: number;
  tx_time_utc: string;
  tx_from: string;
  tx_to: string;
  tx_new_contract: boolean;
  tx_value: string; // unit is ETHER
  tx_fee: string; // unit is ETHER
}

export type FusionResult = {
  list: FusionTransaction[],
  total: number,
  relation: string,
}

export class FusionHelper {
  public static async fetchTransactions(subWallet: AnySubWallet, accountAddress: string, page: number, pageSize: number): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let txListUrl = subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN) + '/txs?a='
    txListUrl += accountAddress;
    txListUrl += '&p=' + page;
    txListUrl += '&ps=' + pageSize;
    txListUrl += '?sort=desc';

    try {
      let result: FusionResult = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);

      if (!result || !result.list || result.list.length == 0) {
        return { transactions: [] };
      }

      let originTransactions = result.list as FusionTransaction[];
      let canFetchMore = result.list.length < pageSize;

      return {
        transactions: <EthTransaction[]>this.convertFusionTransaction2EthTransaction(originTransactions, accountAddress),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'FusionHelper.fetchTransactions() error:', e);
      return { transactions: [] };
    }
  }

  private static convertFusionTransaction2EthTransaction(fusionTransaction: FusionTransaction[], accountAddress: string) {
    let transactions: EthTransaction[] = [];
    for (let i = 0; i < fusionTransaction.length; i++) {
      let ethTransaction: EthTransaction = {
        blockHash: '--', //TODO
        blockNumber: fusionTransaction[i].block_height.toString(),
        confirmations: '', //TODO
        contractAddress: '',
        cumulativeGasUsed: '',
        from: fusionTransaction[i].tx_from,
        to: fusionTransaction[i].tx_to,
        gas: '',
        gasPrice: '',
        gasUsed: new BigNumber(fusionTransaction[i].tx_fee).multipliedBy(Config.WEI).toString(10),
        hash: fusionTransaction[i].tx_hash,
        isError: '',
        nonce: '',
        timeStamp: '' + moment.utc(fusionTransaction[i].tx_time_utc).unix(),
        transactionIndex: '',
        value: new BigNumber(fusionTransaction[i].tx_value).multipliedBy(Config.WEI).toString(10),
        Direction: (fusionTransaction[i].tx_to === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
        isERC20TokenTransfer: false, // TODO
        txreceipt_status: '',
        input: '',
      }
      transactions.push(ethTransaction);
    }
    return transactions;
  }

  // TODO: ERC20, ERC721 ...
}