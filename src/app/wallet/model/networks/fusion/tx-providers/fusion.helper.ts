import BigNumber from "bignumber.js";
import moment from "moment";
import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTokenTransaction, EthTransaction } from "../../evms/evm.types";

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

export type FusionTransactionDetail = FusionTransaction & {
  tx_type: number;
  tx_nonce: number;
  tx_gasprice: string;
  tx_max_fee: string;
  tx_max_priority_fee: string;
  tx_gas_limit: number;
  tx_input: string;
  tx_r: string;
  tx_s: string;
  tx_v: number;
  tx_gas_used: number;
  tx_cumulative_gas_used: number;
  tx_fail_msg: string;
  tx_int_count: number;
  tx_native_transfer: any[];
  tx_log_count: number;
  tx_token_transfer: any[];
}

export type FusionTokenTransaction = {
  tx_hash: string;
  tx_method: string;
  tx_time_utc: string;
  from: string;
  to: string;
  value: string; // unit is ETHER
  start_time: string;
  end_time: string;

  tk_name?: string;
  tk_symbol?: string;
  tk_address?: string;
}

export type FusionResult = {
  list: FusionTransaction[] | FusionTokenTransaction[],
  total: number,
  relation: string,
}

export enum FusionTokenType {
  Fusion_Asset = 1,
  ERC20 = 2,
  FRC758 = 3,
  FRC759 = 5,
  ERC721 = 6,
  ERC1155 = 7,
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
        transactions: <EthTransaction[]>this.convertFusionTransaction2EthTransaction(originTransactions, accountAddress, subWallet.tokenAmountMulipleTimes),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'FusionHelper.fetchTransactions() error:', e);
      return { transactions: [] };
    }
  }

  private static convertFusionTransaction2EthTransaction(fusionTransaction: FusionTransaction[], accountAddress: string, tokenAmountMulipleTimes: BigNumber) {
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
        gas: new BigNumber(fusionTransaction[i].tx_fee).multipliedBy(tokenAmountMulipleTimes).toString(10),
        gasPrice: '',
        gasUsed: '',
        hash: fusionTransaction[i].tx_hash,
        isError: '',
        nonce: '',
        timeStamp: '' + moment.utc(fusionTransaction[i].tx_time_utc).unix(),
        transactionIndex: '',
        value: new BigNumber(fusionTransaction[i].tx_value).multipliedBy(tokenAmountMulipleTimes).toString(10),
        Direction: (fusionTransaction[i].tx_to === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
        isERC20TokenTransfer: false,
        txreceipt_status: '',
        input: '',
      }
      transactions.push(ethTransaction);
    }
    return transactions;
  }

  // Get transactions for token
  public static async fetchTokenTransactions(subWallet: AnySubWallet, contractAddress: string, accountAddress: string, page: number, pageSize: number): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let txListUrl = subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN) + '/token/' + contractAddress + '/txs?a='
    txListUrl += accountAddress;
    txListUrl += '&p=' + page;
    txListUrl += '&ps=' + pageSize;
    txListUrl += '?sort=desc';

    try {
      let result: FusionResult = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);

      if (!result || !result.list || result.list.length == 0) {
        return { transactions: [] };
      }

      let originTransactions = result.list as FusionTokenTransaction[];
      let canFetchMore = result.list.length < pageSize;

      return {
        transactions: <EthTransaction[]>this.convertFusionTokenTransaction2EthTransaction(originTransactions, accountAddress, contractAddress, subWallet.tokenAmountMulipleTimes),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'FusionHelper.fetchTokenTransactions() error:', e);
      return { transactions: [] };
    }
  }

  // Fusion Asset, ERC20, ERC721, ERC1155, FRC758, FRC759
  public static async fetchAllTokenTransactions(subWallet: AnySubWallet, accountAddress: string, type: FusionTokenType, page: number, pageSize: number): Promise<{ transactions: EthTokenTransaction[], canFetchMore?: boolean }> {
    let txListUrl = subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN) + '/token/txs?a='
    txListUrl += accountAddress;
    txListUrl += '&t=' + type;
    txListUrl += '&p=' + page;
    txListUrl += '&ps=' + pageSize;
    txListUrl += '?sort=desc';

    try {
      let result: FusionResult = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);

      if (!result || !result.list || result.list.length == 0) {
        return { transactions: [] };
      }

      let originTransactions = result.list as FusionTokenTransaction[];
      let canFetchMore = result.list.length < pageSize;
      return {
        transactions: <EthTokenTransaction[]>this.convertFusionTokenTransaction2EthTransaction(originTransactions, accountAddress, null, subWallet.tokenAmountMulipleTimes),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'FusionHelper.fetchAllTokenTransactions() error:', e);
      return { transactions: [] };
    }
  }

  private static convertFusionTokenTransaction2EthTransaction(fusionTransaction: FusionTokenTransaction[], accountAddress: string, contractAddress: string = null, tokenAmountMulipleTimes: BigNumber) {
    let transactions: EthTokenTransaction[] = [];
    for (let i = 0; i < fusionTransaction.length; i++) {
      let ethTransaction: EthTokenTransaction = {
        blockHash: '--', //TODO
        blockNumber: '',
        confirmations: '', //TODO
        contractAddress: contractAddress || fusionTransaction[i].tk_address,
        cumulativeGasUsed: '',
        from: fusionTransaction[i].from,
        to: fusionTransaction[i].to,
        gas: '',
        gasPrice: '',
        gasUsed: '',
        hash: fusionTransaction[i].tx_hash,
        isError: '',
        nonce: '',
        timeStamp: '' + moment.utc(fusionTransaction[i].tx_time_utc).unix(),
        transactionIndex: '',
        value: new BigNumber(fusionTransaction[i].value).multipliedBy(tokenAmountMulipleTimes).toString(10),
        Direction: (fusionTransaction[i].to === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
        isERC20TokenTransfer: true,
        txreceipt_status: '',
        input: '',
        tokenSymbol: fusionTransaction[i].tk_symbol,
        tokenName: fusionTransaction[i].tk_name,
        tokenDecimal: undefined, // No decimal
      }
      transactions.push(ethTransaction);
    }
    return transactions;
  }

  public static async fetchTransactionDetail(subWallet: AnySubWallet, txHash: string): Promise<FusionTransactionDetail> {
    let txListUrl = subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN) + '/tx/' + txHash;

    let result: FusionTransactionDetail = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);
    return result;
  }
}