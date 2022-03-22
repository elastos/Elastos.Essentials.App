import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EthTransaction } from "../evm.types";
import { StandardEVMSubWallet } from "../wallets/evm.subwallet";
import { AnySubWallet } from "../wallets/subwallet";
import { EVMSubWalletProvider } from "./evm.subwallet.provider";
import { TransactionDirection } from "./transaction.types";

const MAX_RESULTS_PER_FETCH = 30;
const covalentApiUrl = 'https://api.covalenthq.com/v1/';
const API_KEY = 'ckey_d3c2c09cdd9e4c44980aac3b934'; // https://www.covalenthq.com/

type CovalentTransfer = {
  block_signed_at : string,
  tx_hash : string,
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

type CovalentTransaction = {
  block_signed_at : string,
  block_height: number,
  tx_hash : string,
  tx_offset : number,
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

type Pagination = {
  has_more: boolean,
  page_number : number,
  page_size : number,
  total_count : number,
}
type CovalentData = {
  address: string,
  updated_at: string, //"2021-10-12T06:20:54.298104895Z"
  next_update_at: string,
  quote_currency: string, //"USD"
  chain_id: number,
  items: CovalentTransaction[],
  pagination: Pagination
}

type CovalentResult = {
  data: CovalentData,
  error: string,
  error_message: string,
  error_code: string
}

// Use covalent blockchain data API to get transactions.
export class CovalentEvmSubWalletProvider extends EVMSubWalletProvider<StandardEVMSubWallet> {
  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return  this.canFetchMore;
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = await this.subWallet.createAddress();

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

    let txListUrl = covalentApiUrl;
      txListUrl += this.subWallet.networkWallet.network.getMainChainID();
      txListUrl += '/address/' + accountAddress;
      txListUrl += '/transactions_v2/?page-number=' + page;
      txListUrl += '&page-size=' + MAX_RESULTS_PER_FETCH;
      txListUrl += '&key=' + API_KEY;

    try {
      let result :CovalentResult = await GlobalJsonRPCService.instance.httpGet(txListUrl);

      if (!result || !result.data || !result.data.items || result.data.items.length == 0) {
        Logger.log('wallet', 'No transaction')
        return;
      }

      let originTransactions = result.data.items as CovalentTransaction[];
      this.canFetchMore = result.data.pagination.has_more;

      let transactions: EthTransaction[] = this.covertCovalentTransaction2EthTransaction(originTransactions, accountAddress);
      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'FusionEVMSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }

  covertCovalentTransaction2EthTransaction(covalenthqTransaction: CovalentTransaction[], accountAddress: string) {
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
        nonce : '',
        timeStamp: (new Date(covalenthqTransaction[i].block_signed_at).getTime() / 1000).toString(),
        transactionIndex: '',
        value: covalenthqTransaction[i].value,
        Direction: (covalenthqTransaction[i].to_address === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
        isERC20TokenTransfer : covalenthqTransaction[i].transfers ? true :  false,
        txreceipt_status : '',
        input: '',
      }

      transactions.push(ethTransaction);
    }
    return transactions;
  }
}
