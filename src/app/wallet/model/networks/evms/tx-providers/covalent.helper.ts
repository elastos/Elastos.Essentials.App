import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { EthTransaction } from "../evm.types";

const covalentApiUrl = 'https://api.covalenthq.com/v1/';
const API_KEY = 'ckey_d3c2c09cdd9e4c44980aac3b934'; // https://www.covalenthq.com/

export type CovalentTransfer = {
  block_signed_at: string,
  tx_hash: string,
  from_address: string,
  from_address_label: string,
  to_address: string,
  contract_decimals: number,
  contract_name: string,
  contract_ticker_symbol: string,
  contract_address: string,
  logo_url: string,
  transfer_type: string, //'OUT'
  delta: string,
  balance: string,
  quote_rate: string,
  delta_quote: string,
  balance_quote: string,
  method_calls: string,
}

export type CovalentTransaction = {
  block_signed_at: string,
  block_height: number,
  tx_hash: string,
  tx_offset: number,
  successful: boolean,
  from_address: string,
  from_address_label: string,
  to_address: string,
  to_address_label: string,
  value: string,
  value_quote: string,
  gas_offered: number,
  gas_spent: number,
  gas_price: number,
  gas_quote: string,
  gas_quote_rate: string,
  log_event?: [],
  transfers?: CovalentTransfer[] // Token Transaction
}

export type CovalentTokenBalanceItem = {
  balance: string; // eg: "0"
  balance_24h: string; // eg: "0"
  contract_address: string; // eg: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  contract_decimals: number; // eg: 18
  contract_name: string; // eg: "IoTeX"
  contract_ticker_symbol: string; // eg: "IOTX"
  last_transferred_at: string; // eg: null
  logo_url: string; // eg: "https://www.covalenthq.com/static/images/icons/display-icons/iotex-logo.svg"
  nft_data: any; // eg: null
  quote: number; // eg: 0
  quote_24h: number; // eg: 0
  quote_rate: number; // eg: 0.0729151
  quote_rate_24h: number; // eg: 0.07290881
  supports_erc?: string[]; // eg: ["erc20"]
  type: "cryptocurrency" | "stablecoin" | "nft" | "dust";
}

export type Pagination = {
  has_more: boolean,
  page_number: number,
  page_size: number,
  total_count: number,
}

export type CovalentData<T> = {
  address: string,
  updated_at: string, //"2021-10-12T06:20:54.298104895Z"
  next_update_at: string,
  quote_currency: string, //"USD"
  chain_id: number,
  items: T[],
  pagination: Pagination
}

export type CovalentResult<T> = {
  data: CovalentData<T>,
  error: string,
  error_message: string,
  error_code: string
}

export class CovalentHelper {
  public static apiUrl(): string {
    return covalentApiUrl;
  }

  public static async fetchTransactions(chainId: number, accountAddress: string, page: number, pageSize: number): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let txListUrl = covalentApiUrl;
    txListUrl += chainId;
    txListUrl += '/address/' + accountAddress;
    txListUrl += '/transactions_v2/?page-number=' + page;
    txListUrl += '&page-size=' + pageSize;
    txListUrl += '&key=' + API_KEY;

    try {
      let result: CovalentResult<CovalentTransaction> = await GlobalJsonRPCService.instance.httpGet(txListUrl);

      if (!result || !result.data || !result.data.items || result.data.items.length == 0) {
        return { transactions: [] };
      }

      let originTransactions = result.data.items as CovalentTransaction[];
      let canFetchMore = result.data.pagination.has_more;

      return {
        transactions: <EthTransaction[]>this.convertCovalentTransaction2EthTransaction(originTransactions, accountAddress),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'CovalentHelper.fetchTransactions() error:', e);
      return { transactions: [] };
    }
  }

  private static convertCovalentTransaction2EthTransaction(covalenthqTransaction: CovalentTransaction[], accountAddress: string) {
    let transactions: EthTransaction[] = [];
    for (let i = 0; i < covalenthqTransaction.length; i++) {
      let ethTransaction: EthTransaction = {
        blockHash: '--', //TODO
        blockNumber: covalenthqTransaction[i].block_height.toString(),
        confirmations: '', //TODO
        contractAddress: '',
        cumulativeGasUsed: '',
        from: covalenthqTransaction[i].from_address,
        to: covalenthqTransaction[i].to_address,
        gas: covalenthqTransaction[i].gas_offered.toString(),
        gasPrice: covalenthqTransaction[i].gas_price.toString(),
        gasUsed: covalenthqTransaction[i].gas_spent.toString(),
        hash: covalenthqTransaction[i].tx_hash,
        isError: covalenthqTransaction[i].successful ? '0' : '1',
        nonce: '',
        timeStamp: (new Date(covalenthqTransaction[i].block_signed_at).getTime() / 1000).toString(),
        transactionIndex: '',
        value: covalenthqTransaction[i].value,
        Direction: (covalenthqTransaction[i].to_address === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
        isERC20TokenTransfer: covalenthqTransaction[i].transfers ? true : false,
        txreceipt_status: '',
        input: '',
      }

      transactions.push(ethTransaction);
    }
    return transactions;
  }

  /**
   * Fetches ERC20/721/1155 token balances for an EVM (0x) address and saves tokens to wallet.
   */
  public static async fetchTokenBalances(accountAddress: string, chainId: number): Promise<CovalentTokenBalanceItem[]> {
    let tokenBalancesUrl = covalentApiUrl;
    tokenBalancesUrl += chainId;
    tokenBalancesUrl += '/address/' + accountAddress;
    tokenBalancesUrl += '/balances_v2/';
    tokenBalancesUrl += '?key=' + API_KEY;
    tokenBalancesUrl += '&format=JSON';

    try {
      let result: CovalentResult<CovalentTokenBalanceItem> = await GlobalJsonRPCService.instance.httpGet(tokenBalancesUrl);

      if (!result || !result.data || !result.data.items || result.data.items.length == 0) {
        Logger.log('wallet', 'No tokens from covalent')
        return null;
      }

      return result.data.items;
    } catch (e) {
      Logger.error('wallet', 'CovalentHelper fetchTokenBalances error:', e)
    }
    return null;
  }
}