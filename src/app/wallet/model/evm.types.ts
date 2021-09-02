import { TransactionDirection, ElastosTransaction } from "./providers/transaction.types";

// Returned from rpc
export type EthTransaction = ElastosTransaction & {
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
  transferType: string;

  Direction: TransactionDirection;
  isERC20TokenTransfer: boolean,
};

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
 export type ERC20TokenInfo = {
  type: string;
  symbol: string;
  name: string;
  decimals: string;
  contractAddress: string;
  balance: string;
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
