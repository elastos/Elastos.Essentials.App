import BigNumber from 'bignumber.js';
import { JSONObject } from 'src/app/model/json';

export enum TransactionStatus {
    CONFIRMED = 'confirmed',
    PENDING = 'pending',
    UNCONFIRMED = 'unconfirmed'
}

export enum TransactionDirection {
    RECEIVED = "received",
    SENT = "sent",
    MOVED = "moved",
    DEPOSIT = "deposit"
}

export enum TransactionType {
    RECEIVED = 1,
    SENT = 2,
    TRANSFER = 3
}

export enum ContractType {
    Create = 1,
    Call = 2,
    ToeknTransfer = 3,
    Destroy = 4,
    NotContract = 5
}

export enum UtxoType {
    Normal = 'normal',
    Vote = 'vote',
    Mixed = 'mixed',
}

// Returned by gethistory
export enum VoteCategory {
    No_Vote = 0,
    DPOS_Vote = 1,
    CRC_Vote = 2,
    CRProposal_Against = 4,
    CRC_Impeachment = 8,
}

// Returned by getrawtransaction
export enum RawVoteType {
  //Delegate indicates the vote content is for producer.
  Delegate  = 0,
  // CRC indicates the vote content is for CRC.
  CRC = 1,
  // Proposal indicates the vote content is for reject proposal.
  CRCProposal  = 2,
  // Reject indicates the vote content is for impeachment.
  CRCImpeachment  = 3,
}

// Returned from rpc
export type RawCandidates = {
  candidate: string,
  votes: string, //ela
}
export type RawVoteContent = {
  votetype: RawVoteType,
  candidates: RawCandidates[],
}

export type TransactionInfo = {
    amount: BigNumber,
    confirmStatus: number,
    datetime: any,
    direction: TransactionDirection,
    fee: string,
    height: number,
    memo: string;
    name: string,
    payStatusIcon: string,
    status: string,
    statusName: string,
    symbol: string,
    to: string,
    from: string,
    timestamp: number,
    txid: string,
    type: TransactionType,
    isCrossChain: boolean,
    erc20TokenSymbol?: string,
    erc20TokenValue?: string,
    erc20TokenContractAddress?: string,
};

/**
 * Transaction type as returned by the SPV SDK.
 * TODO: Use a different type enum for each chain. Values are partly common, partly different.
 */
export enum RawTransactionType {
    CoinBase                 = 0x00,
    RegisterAsset            = 0x01,
    TransferAsset            = 0x02,
    Record                   = 0x03,
    Deploy                   = 0x04,
    SideChainPow             = 0x05,
    RechargeToSideChain      = 0x06,
    WithdrawFromSideChain    = 0x07,
    TransferCrossChainAsset  = 0x08,
    RegisterProducer         = 0x09,
    CancelProducer           = 0x0a, // NOTE - MESSY - For IDChain, This value means "DID published"
    UpdateProducer           = 0x0b,
    ReturnDepositCoin        = 0x0c,
    ActivateProducer         = 0x0d,

    IllegalProposalEvidence  = 0x0e,
    IllegalVoteEvidence      = 0x0f,
    IllegalBlockEvidence     = 0x10,
    IllegalSidechainEvidence = 0x11,
    InactiveArbitrators      = 0x12,
    UpdateVersion            = 0x13,
    NextTurnDPOSInfo         = 0x14,
    CustomIDResult           = 0x15,

    RegisterCR               = 0x21,
    UnregisterCR             = 0x22,
    UpdateCR                 = 0x23,
    ReturnCRDepositCoin      = 0x24,

    CrcProposal              = 0x25,
    CrcProposalReview        = 0x26,
    CrcProposalTracking      = 0x27,
    CrcAppropriation         = 0x28,
    CrcProposalWithdraw      = 0x29,
    CrcProposalRealWithdraw  = 0x2a,
    CRAssetsRectify          = 0x2b,
    CrCouncilMemberClaimNode = 0x31,

    RevertToPOW              = 0x41,
    RevertToDPOS             = 0x42
}

/**
 * Raw list of transactions as received from the SPVSDK.
 */
/* export type AllTransactions = {
    MaxCount: number,
    Transactions: EthTransaction[] // TODO: ETH transactions? So this Alltransactions type is for ETH only? Rename and move to EVM types?
}; */

// ****************************************

// Base transaction type for all networks, all chains
export type GenericTransaction = JSONObject & {
  // Transactions should be cacheable in a time based cache and therefore need to implement the below items
  //cacheKey: string;       
  //cacheTimeValue: number;
}

// Transactions from rpc
export type ElastosTransaction = GenericTransaction & {
    address: string;
    fee: string;
    height: number;
    inputs: string[];
    outputs: string[];
    memo: string;
    Status: TransactionStatus;
    time: number;
    txid: string;
    txtype: RawTransactionType;
    type: TransactionDirection;
    value: string;
    votecategory: VoteCategory;
}

export type PaginatedTransactions<T extends GenericTransaction> = {
  total: number;
  transactions: T[]
}

// Raw list of transactions as received from the rpc.
export type ElastosPaginatedTransactions = {
    totalcount?: number,
    MaxCount?: number,// TODO
    txhistory: ElastosTransaction[]
};

export type attribute = {
  usage: number;
  data: string;
}

export type inobj = {
  sequence: number;
  txid: string;
  vout: number;
}

export type outobj = {
  address: string;
  assetid: string;
  n: number;
  outputlock: string;
  payload: any;
  type: RawTransactionType;
  value: string;
}

export type payload = {
  // ELA main chain to side chian
  crosschainaddresses: string[];
  crosschainamounts: number[];
  outputindexes: number[];
  // Side chain to ELA main chain
  blockheight: number;
  genesisblockaddress: string;
  sidechaintransactionhashes: string[];
}

// Return by getrawtransaction api
export type TransactionDetail = {
  txid: string;
  hash: string;
  size: number;
  vsize: number;
  version: number;
  type: RawTransactionType;
  payloadversion: number;
  payload: payload;
  attributes: attribute[];
  vin: inobj[];
  vout : outobj[];
  locktime: number;
  programs: any;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

export type Utxo = {
    address: string;
    amount: string;
    assetid: string;
    confirmations: number;
    outputlock: number;
    txid: string;
    txtype: RawTransactionType;
    vout: number;
}

export type UtxoForSDK = {
  Address: string;
  Amount: string; //sela
  Index: number;
  TxHash: string;
}

/**
 * Result of calls to signAndSendRawTransaction().
 */
 export type RawTransactionPublishResult = {
  published: boolean; // Whether the transaction was successfully published to the node/spvsdk or not
  txid?: string; // In case of successful publication, ID of the published transaction.
  status?: string; // published, cancelled, error
  code?: number;  // Error code.
  message?: string; // Errror message.
}