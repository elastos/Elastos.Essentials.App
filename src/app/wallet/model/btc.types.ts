import { GenericTransaction, TransactionDirection } from "./tx-providers/transaction.types";

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
    unconfirmedTxs: string;
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
    blockHeight: number;
    confirmations: number;
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
}
