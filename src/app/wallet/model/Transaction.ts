import BigNumber from 'bignumber.js';

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

export type TransactionInfo = {
    amount: BigNumber,
    confirmStatus: number,
    datetime: any,
    direction: TransactionDirection,
    fee: number,
    memo: string;
    name: string,
    payStatusIcon: string,
    status: string,
    statusName: string,
    symbol: string,
    timestamp: number,
    txid: string,
    type: TransactionType,
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
 * Raw transaction as received from the SPVSDK.
 */
export type Transaction = {
    Amount: string;
    Fee: number;
    ConfirmStatus: number;
    Direction: TransactionDirection;
    Height: number;
    Status: TransactionStatus;
    Timestamp: number;
    TopUpSidechain: string;
    TxHash: string;
    Type: RawTransactionType;
    OutputPayload: string;
    Inputs: any; // TODO: type
    Outputs: any; // TODO: type
    Memo: string;
};

export type EthTransaction = Transaction & {
    // ETHSC
    BlockNumber: number;
    Confirmations: number;
    ErrorDesc: string;
    GasLimit: number;
    GasPrice: string;
    GasUsed: number;
    Hash: string;
    ID: string;
    IsConfirmed: boolean;
    IsErrored: boolean;
    IsSubmitted: boolean;
    OriginTxHash: string;
    SourceAddress: string;
    TargetAddress: string;
    Token: string;
    TokenAddress: string;
    TokenAmount: string;
    TokenFunction: string;
};

/**
 * Raw list of transactions as received from the SPVSDK.
 */
export type AllTransactions = {
    MaxCount: number,
    Transactions: Transaction[]
};

// ****************************************

// Transactions from rpc
export type TransactionHistory = {
    address: string;
    fee: string;
    height: number;
    inputs: string[];
    outputs: string[];
    memo: string;
    Status: TransactionStatus;
    time: number;
    txid: string;
    txtype: string;
    type: TransactionDirection;
    value: string;
}

// Raw list of transactions as received from the rpc.
export type AllTransactionsHistory = {
    totalcount: number,
    txhistory: TransactionHistory[]
};

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