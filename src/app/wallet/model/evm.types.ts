import { TransferType } from "../services/cointransfer.service";
import { TokenType } from "./coin";
import { GenericTransaction, TransactionDirection } from "./providers/transaction.types";

export type EthTransaction = GenericTransaction & {
  // Returned from rpc
  blockHash: string;
  blockNumber: string;
  confirmations: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  isError: string;
  nonce: string;
  timeStamp: string;
  to: string;
  transactionIndex: string;
  txreceipt_status: string;
  value: string;

  // Computed
  Direction: TransactionDirection;
  isERC20TokenTransfer: boolean,
};

export type ElastosSCEthTransaction = EthTransaction & {
  transferType: TransferType;
}

/**
 * Signed ETHSC transaction
 */
export type SignedETHSCTransaction = {
  Fee: string,
  Hash: string,
  TxSigned: string,
  Unit: number
};

// Returned by rpc,
export type EthTokenTransaction = EthTransaction & {
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
}

// Show the erc20 token info if the ETHSC transaction is a erc20 token transfer.
export type ERC20TokenTransactionInfo = {
  to: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenValue: string;
}

/**
 * Information about ERC20 Token
 */
export type ERCTokenInfo = {
  type: TokenType;
  symbol: string;
  name: string;
  decimals: string;
  contractAddress: string;
  balance: string;
  hasOutgoTx: boolean;
}

// For speedup eth transaction.
export enum ETHTransactionStatus {
  CANCEL = 'cancel',
  PACKED = 'packed',
  UNPACKED = 'unpacked',
}
export enum ETHSCTransferType {
  DEPOSIT = "crossChainEthDeposit",
  TRANSFER = "ethTransfer",
  WITHDRAW = "crossChainEthWithdraw"
}
