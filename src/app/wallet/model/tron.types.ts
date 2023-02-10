import { GenericTransaction } from "./tx-providers/transaction.types";

export type RequestResponse = {
    data: any;
    success: boolean;
    meta: {
        at: number,
        page_size : number,
    };
}

export type AccountResult = {
    latest_opration_time: number,
    owner_permission: any,
    account_resource: any,
    active_permission: any[],
    frozenV2: any[],
    address: string,
    balance: number, //TRX, unit : sun
    create_time: number,
    trc20: {
        [tokenId: string]: string
    } [],
};

export type TronContractData = {
    parameter: {
        value: {
            amount: number, //1000000,
            owner_address: string, //"410ad689150eb4a3c541b7a37e6c69c1510bcb27a4",
            to_address: string //"418f723ec92f28a87c0a1d28d83210487b1af86e19"
        },
        type_url: string //"type.googleapis.com/protocol.TransferContract"
    },
    type: string //TransferContract
}

export type TronTransactionData = {
    contract: TronContractData[],
    ref_block_bytes: string, //"0767",
    ref_block_hash: string, // "3274bd9cf7bfef36",
    expiration: number,
    timestamp: number, //1675849603707
}

export type TronTransaction = GenericTransaction & {
    ret: {
        contractRet: string, //"SUCCESS"
        fee: number, // 1100000
    } [],
    signature: string[],
    txID: string,
    net_usage: number,
    raw_data_hex: string,
    net_fee: number, //100000
    energy_usage: number,
    blockNumber: number,
    block_timestamp: number,
    energy_fee: number,
    energy_usage_total: number,
    raw_data: TronTransactionData,
    internal_transactions: [],
};
