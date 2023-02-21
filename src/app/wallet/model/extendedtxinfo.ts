import { ETHTransactionInfo } from "./networks/evms/ethtransactioninfoparser";
import { TronTransactionInfo } from "./tron.types";

/**
 * Additional information about a transaction hash, usually fetched after getting the base transaction info.
 * For EVMs for example, APIs usually return basic tx info but we also fetch the transaction receipt to get
 * additional info about the kind of smart contract transactions that have been executed.
 */
export type ExtendedTransactionInfo = {
  /// EVM specific information
  evm?: {
    transactionReceipt: any; // Real type is: TransactionReceipt from web3-core;
    txInfo?: ETHTransactionInfo;
  },
  /// TVM specific information
  tvm?: {
    txInfo?: TronTransactionInfo;
  }
}