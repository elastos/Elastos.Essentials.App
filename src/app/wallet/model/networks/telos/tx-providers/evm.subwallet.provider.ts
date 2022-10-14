import moment from "moment";
import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../../evms/evm.types";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { TelosAPI, TelosAPIType } from "../network/telos.api";

const MAX_RESULTS_PER_FETCH = 200;

type TelosTransactionsResponse = {
  //"query_time_ms": 24,
  //"search_scope": "0x123",
  //"from_address": 1,
  //"to_address": 1,
  "total": number; // ie 2
  "transactions": TelosTransaction[];
}

type TelosTransaction = {
  "hash": string; // ie "0xdbf9206bb159ddc83255c049418b6c36423f04796e6e2c57c32f8c13bcb73a11",
  "trx_index": string; // ie 0,
  "block_num": number; // ie 181813425,
  "block": number; // ie 181813389,
  "block_hash": string; // ie "78f23af08c264cdc9f10b4b4e8e8e4c5a95f7cbcb9f9ce83977cb952f636d539",
  "from": string; // "0xba1ddcb94b3f8fe5d1c0b2623cf221e099f485d1",
  "to": string; // ie "0xba90cbd09a737ff08580d3ab415dc187a40bec67",
  //"input_data": "0x",
  "value": string; // ie "100000000000000000",
  "nonce": string; // ie "0",
  "gas_price": string; // ie "624761473981",
  "gas_limit": string; // ie "40000",
  "status": number; // ie 1,
  //"itxs": [],
  "epoch": number; // ie 1635821300,
  //"createdaddr": "",
  "gasused": number; // ie 21000,
  //"gasusedblock": 21000,
  //"charged_gas_price": 499809179185,
  //"output": "",
  //"v": "73",
  //"r": "5b6a49a8411a6a7d0a8eb9a0d343f2cad9dec8580401282248c1ac634c478092",
  //"s": "2025f685097bd685c164636c1978bee20e041850dcc2b56ef00edb4ec51798ac",
  "value_d": number; // ie 0.1,
  "trx_id": string; // ie "4daf9f2bd35682617a5f05c78145d37b40ed28d3504059c06f73c8a49b113f6f",
  "@timestamp": string; // ie "2021-11-02T02:48:20.000"
}

export class TelosEvmSubWalletProvider extends EtherscanEVMSubWalletProvider<AnyMainCoinEVMSubWallet> {
  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false; // TODO
  }

  // https://rpc1.us.telos.net/evm_explorer/get_transactions?address=0x123
  // TODO: No parameters in get_transactions for now.
  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = this.subWallet.getCurrentReceiverAddress();

    let page = 1;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      // TODO: No parameters in get_transactions for now.
      //throw new Error("Telos EVM provider: afterTransaction not yet supported");
      return;
    }

    let txListUrl = `${TelosAPI.getApiUrl(TelosAPIType.TELOS_EXPLORER_API, this.subWallet.networkWallet.network.networkTemplate)}/evm_explorer/get_transactions`;
    txListUrl += '?page=' + page;
    txListUrl += '&offset=' + MAX_RESULTS_PER_FETCH;
    txListUrl += '&sort=desc';
    txListUrl += '&address=' + accountAddress;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl, subWallet.networkWallet.network.key) as TelosTransactionsResponse;

      let transactions: EthTransaction[] = [];
      let telosTransactions = result.transactions;
      if (!(telosTransactions instanceof Array)) {
        Logger.warn('wallet', 'fetchTransactions invalid transactions:', telosTransactions)
        return null;
      }
      for (let telosTransaction of telosTransactions) {
        let transaction: EthTransaction = {
          blockHash: telosTransaction.block_hash,
          blockNumber: "" + telosTransaction.block, // TODO: block or block_num ?
          confirmations: "-1", // TODO: not in the api?
          contractAddress: null, // TODO: no such info in the api ?
          cumulativeGasUsed: "", // TODO
          from: telosTransaction.from,
          gas: telosTransaction.gas_limit,
          gasPrice: telosTransaction.gas_price,
          gasUsed: "" + telosTransaction.gasused,
          hash: telosTransaction.hash,
          input: "",
          isError: "",
          nonce: telosTransaction.nonce,
          timeStamp: "" + moment.utc(telosTransaction["@timestamp"]).unix(),
          to: telosTransaction.to,
          transactionIndex: telosTransaction.trx_index,
          txreceipt_status: "",
          value: telosTransaction.value,
          Direction: (telosTransaction.to === accountAddress) ? TransactionDirection.RECEIVED : TransactionDirection.SENT,
          isERC20TokenTransfer: false, // TODO
        };

        // Convert telos tx to our tx format
        transaction.from = telosTransaction.from;

        transactions.push(transaction);
      }

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'TelosEvmSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }
}
