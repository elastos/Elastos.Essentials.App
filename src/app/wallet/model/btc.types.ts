import BigNumber from "bignumber.js";
import { GenericTransaction, TransactionDirection } from "./tx-providers/transaction.types";
import { UnisatUtxo } from "./unisat.types";

export const UtxoDust = 546;
export const SmallUtxo = UtxoDust + 10;
// TODO:
// export function getUtxoDust(addressType: AddressType) {
//   if (
//     addressType === AddressType.P2WPKH ||
//     addressType === AddressType.M44_P2WPKH
//   ) {
//     return 294;
//   } else if (
//     addressType === AddressType.P2TR ||
//     addressType === AddressType.M44_P2TR
//   ) {
//     return 330;
//   } else {
//     return 546;
//   }
// }

export enum BitcoinAddressType {
  Legacy = "legacy", // p2pkh
  P2sh = "p2sh",
  NativeSegwit = "nativesegwit", // p2wpkh
  Taproot = 'taproot'
}

export const BTC_MAINNET_PATHS = {
  "legacy": "44'/0'/0'/0/0",
  "p2sh": "49'/0'/0'/0/0",
  "nativesegwit": "84'/0'/0'/0/0",
  "taproot": "86'/0'/0'/0/0",
};

export const BTC_TESTNET_PATHS = {
  "legacy": "44'/1'/0'/0/0",
  "p2sh": "49'/1'/0'/0/0",
  "nativesegwit": "84'/1'/0'/0/0",
  "taproot": "86'/1'/0'/0/0",
};

export type BalanceHistory = {
    received: string;
    sent: string;
    sentToSelf: string;
    time: number;
    txs: number;
};

export type AddressResult = {
    address: string;
    balance: string;
    page: number;
    totalPages: number;
    itemsOnPage: number;
    totalReceived: string;
    totalSend: string;
    unconfirmedBalance: string;
    unconfirmedTxs: number;
    txids: string[];
    txs: number;
};

export type BTCInObj = {
    txid: string;
    sequence: number;
    n: number;
    addresses: string[];
    value: string; // sotoshi
    isAddress: boolean;
    hex: string;
}

export type BTCOutObj = {
    value: string;
    n: number;
    hex: string;
    addresses: string[];
    isAddress: boolean;
}

export type BTCTransaction = GenericTransaction & {
    txid: string;
    version: string;
    vin: BTCInObj[];
    vout: BTCOutObj[];
    blockHash: string;
    blockHeight: number;   // -1: unconfirmed tx
    confirmations: number; // 0:  unconfirmed tx
    time: number;
    blockTime: number;
    value: string;  // sotoshi
    valueIn: string;// sotoshi
    fees: string;   // sotoshi
    hex: string;

    to?: string;
    from?: string;
    direction?: TransactionDirection;
    realValue?: number;
}

export type BTCUTXO = {
    txid: string;
    hash: string;
    value: string; //satoshi
    height: number;
    vout: number;
    confirmations: number;
    scriptPubKey?: string;
    utxoHex?: string
}

// BTC payment transaction

export type BTCOutputData = {
  Address: string,
  Amount : number
}

export type BTCTxData = {
  inputs: BTCUTXO[],
  outputs: BTCOutputData[],
  changeAddress: string,
  feePerKB: string,
  fee?: number // SATOSHI
}

/**
 * Result of a btc transaction signing request to a safe
 */
 export type BTCSignedTransactionResult = {
  Data?: string;
  TxHash?: string;
}

/**
 * Result of networkinfo
 */
export type BTCNetworkInfoResult = {
  version: number;
  subversion: string;
  protocolversion: number;
  localservices: string;
  localservicesnames: string[];
  localrelay: boolean;
  timeoffset: number;
  networkactive: number;
  connections: number;
  connections_in: number;
  connections_out: number;
  networks: any[];
  relayfee: number; // 0.00001
  incrementalfee: number;
  localaddresses: any[];
  warnings: string;
}

/**
 * For inscription
 */
export type InscriptionUtxoData = {
  total: BigNumber;
  utxo: UnisatUtxo[]
}


// sign data type
export type BTCSignDataType = "ecdsa" | "schnorr";