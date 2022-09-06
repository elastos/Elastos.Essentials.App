import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../evm.types";

const covalentApiUrl = 'https://api.covalenthq.com/v1/';
const API_KEY = 'ckey_d3c2c09cdd9e4c44980aac3b934'; // https://www.covalenthq.com/

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

export type CovalentTokenBalanceNFTItem = {
    token_id: string;
    token_balance: string;
    token_url: string;
    supports_erc?: string[]; // eg: ["erc20"]
    token_price_wei: string; // eg: null
    token_quote_rate_eth: string; // eg: null
    original_owner: string;
    external_data: string; // eg: null
    owner: string;
    owner_address: string; // eg: null
    burned: string; // eg: null
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
  nft_data: CovalentTokenBalanceNFTItem[]; // eg: null
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

export type CovalentTransfer = {
  block_signed_at: string; // The signed time of the block.
  tx_hash: string; // The transaction hash.
  from_address: string; // The address where the transfer is from.
  from_address_label: string; // The label of from address.
  to_address: string; // The address where the transfer is to.
  to_address_label: string; // The label of to address.
  contract_decimals: number; // Smart contract decimals.
  contract_name: string; // Smart contract name.
  contract_ticker_symbol: string; // Smart contract ticker symbol.
  contract_address: string; //Smart contract address.
  logo_url: string; // Smart contract URL.
  transfer_type: string; // IN/OUT.
  delta: string; // The delta attached to this transfer.
  balance: number; // The transfer balance. Use contract_decimals to scale this balance for display purposes.
  quote_rate: number; // The current spot exchange rate in quote-currency.
  delta_quote: number; // The current delta converted to fiat in quote-currency.
  balance_quote: number; // The current balance converted to fiat in quote-currency.
  method_calls: any[]; // Additional details on which transfer events were invoked. Defaults to true.
};

export type BlockTransactionWithContractTransfers = {
  block_signed_at: string; // The signed time of the block.
  block_height: number; // The height of the block.
  tx_hash: string; // The transaction hash.
  tx_offset: number; // The transaction offset.
  successful: boolean; // The transaction status.
  from_address: string; // The address where the transaction is from.
  from_address_label: string; // The label of from address.
  to_address: string; // The address where the transaction is to.
  to_address_label: string; // The label of to address.
  value: number; // The value attached to this tx.
  value_quote: number; // The value attached in quote-currency to this tx.
  gas_offered: number; // The gas offered for this tx.
  gas_spent: number; // The gas spent for this tx.
  gas_price: number; // The gas price at the time of this tx.
  fees_paid: number; // The total transaction fees paid for this tx.
  gas_quote: number; // The gas spent in quote-currency denomination.
  gas_quote_rate: number; // The gas exchange rate at the time of Tx in quote_currency.
  transfers: CovalentTransfer[]; // Transfer items.
}

export class CovalentHelper {
  public static apiUrl(): string {
    return covalentApiUrl;
  }

  public static async fetchTransactions(subWallet: AnySubWallet, chainId: number, accountAddress: string, page: number, pageSize: number): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let txListUrl = covalentApiUrl;
    txListUrl += chainId;
    txListUrl += '/address/' + accountAddress;
    txListUrl += '/transactions_v2/?page-number=' + page;
    txListUrl += '&page-size=' + pageSize;
    txListUrl += '&key=' + API_KEY;

    try {
      let result: CovalentResult<CovalentTransaction> = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key);

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
      // console.log("covalent tx", covalenthqTransaction[i]);

      transactions.push(ethTransaction);
    }
    return transactions;
  }

  /**
   * Fetches ERC20/721/1155 token balances for an EVM (0x) address and saves tokens to wallet.
   */
  public static async fetchTokenBalances(subWallet: AnySubWallet, accountAddress: string, chainId: number): Promise<CovalentTokenBalanceItem[]> {
    let tokenBalancesUrl = covalentApiUrl;
    tokenBalancesUrl += chainId;
    tokenBalancesUrl += '/address/' + accountAddress;
    tokenBalancesUrl += '/balances_v2/';
    tokenBalancesUrl += '?key=' + API_KEY;
    tokenBalancesUrl += '&format=JSON&nft=true&no-nft-fetch=false';

    try {
      let result: CovalentResult<CovalentTokenBalanceItem> = await GlobalJsonRPCService.instance.httpGet(tokenBalancesUrl, subWallet.networkWallet.network.key);

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

  public static async fetchERC20Transfers(subWallet: AnySubWallet, chainId: number, accountAddress: string, contractAddress: string, page: number, pageSize: number): Promise<{ transactions: EthTransaction[], canFetchMore?: boolean }> {
    let transferListUrl = covalentApiUrl;
    transferListUrl += chainId;
    transferListUrl += '/address/' + accountAddress;
    transferListUrl += '/transfers_v2/?page-number=' + page;
    transferListUrl += '&page-size=' + pageSize;
    transferListUrl += '&contract-address=' + contractAddress;
    transferListUrl += '&key=' + API_KEY;

    try {
      let result: CovalentResult<BlockTransactionWithContractTransfers> = await GlobalJsonRPCService.instance.httpGet(transferListUrl, subWallet.networkWallet.network.key);

      if (!result || !result.data || !result.data.items || result.data.items.length == 0) {
        return { transactions: [] };
      }

      let originTransactions = result.data.items as BlockTransactionWithContractTransfers[];
      let canFetchMore = result.data.pagination.has_more;

      return {
        transactions: <EthTransaction[]>this.convertCovalentTransfer2EthTransaction(originTransactions, accountAddress),
        canFetchMore
      };
    } catch (e) {
      Logger.error('wallet', 'CovalentHelper.fetchERC20Transfers() error:', e);
      return { transactions: [] };
    }
  }

  private static convertCovalentTransfer2EthTransaction(blockTransactions: BlockTransactionWithContractTransfers[], accountAddress: string) {
    let transactions: EthTransaction[] = [];
    for (let blockTransaction of blockTransactions) {

      for (let transfer of blockTransaction.transfers) {
        let ethTransaction: EthTransaction = {
          blockHash: '--', //TODO
          blockNumber: blockTransaction.block_height.toString(),
          confirmations: '', //TODO
          contractAddress: transfer.contract_address.toLowerCase(),
          cumulativeGasUsed: '',
          from: transfer.from_address,
          to: transfer.to_address,
          gas: blockTransaction.gas_offered.toString(),
          gasPrice: blockTransaction.gas_price.toString(),
          gasUsed: blockTransaction.gas_spent.toString(),
          hash: blockTransaction.tx_hash,
          isError: blockTransaction.successful ? '0' : '1',
          nonce: '',
          timeStamp: (new Date(blockTransaction.block_signed_at).getTime() / 1000).toString(),
          transactionIndex: '',
          value: transfer.delta,
          Direction: (transfer.to_address === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
          isERC20TokenTransfer: true,
          txreceipt_status: '',
          input: '',
        }

        transactions.push(ethTransaction);
      }
    }
    return transactions;
  }
}