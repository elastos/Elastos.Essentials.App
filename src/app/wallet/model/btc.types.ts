
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

export type ScriptSig = {
    asm: string;
    hex: string;
}

export type ScriptPubKey = {
    asm: string;
    hex: string;
    address: string;
    type: string;
}

export type btcinobj = {
    txid: string;
    vout: number;
    scriptSig: ScriptSig;
    txinwitness: string[];
    sequence: number;
}

export type btcoutobj = {
    value: string;
    n: number;
    scriptPubKey: ScriptPubKey;
}

export type BTCTransaction = {
    txid: string;
    hash: string;
    version: string;
    size: number;
    vsize: number;
    weight: number;
    locktime: number;
    vin: btcinobj[];
    vout : btcoutobj[];
    hex: string;
    blockhash: string;
    confirmations: number;
    time: number;
    blocktime: number;
}
