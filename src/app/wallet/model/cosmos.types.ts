import { IndexedTx } from "@cosmjs/stargate";
import { GenericTransaction, TransactionDirection } from "./tx-providers/transaction.types";

// export enum CosmosEventType {
//     COIN_RECEIVED = 'coin_received',
//     COIN_SPENT = 'coin_spent',
//     MESSAGE = 'message',
//     TRANSFER = 'transfer',
//     TX = 'tx'
// }

// export enum CosmosEventKey {
//     ACC_SEQ = 'acc_seq',
//     ACTION = 'action',
//     AMOUNT = 'amount',
//     FEE = 'fee',
//     FEE_PAYER = 'fee_payer',
//     MODULE = 'module',
//     RECEIVER = 'receiver',
//     RECIPIENT = 'recipient',
//     SPENDER = 'spender',
//     SENDER = 'sender',
//     SIGNATURE = 'signature',
// }

// export type CosmosEvent = {
//     type: CosmosEventType,
//     attributes: {
//         key: CosmosEventKey,
//         value: string
//     }[],
// }

// export type CosmosAccount = {
//     address: string,
//     algo: string, // secp256k1
//     pubkey: Uint8Array[],
// }

// // coins
// export type CosmosBalance = {
//     amount: string, // '4000000'
//     denom: string, // 'uatom'
// }

export type CosmosTransaction = GenericTransaction & IndexedTx & {
    // IndexedTx:
    //    --code
    //    --gasWanted
    //    --gasUsed
    //    --hash
    //    --height
    //    --rawLog

    from: string,
    to: string,
    type: string,
    value: string,
    timestamp: number;
    fee?: string;

    direction?: TransactionDirection;
};

// DeliverTxResponse
// export type SendTokenResult = {
//     code: number, // 0
//     events: any[],
//     gasUsed: number, // 78202
//     gasWanted: number, // 87581
//     heightt: number,
//     rawLog; string,
//     transactionHash: string,
//     txIndex: number, //0
// };
