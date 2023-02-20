import { GenericTransaction, TransactionDirection } from "./tx-providers/transaction.types";

export type RequestResponse = {
    data: any;
    success: boolean;
    meta: {
        at: number,
        page_size : number,
    };
}

export type AccountTRC20Token = {
    [tokenId: string]: string // "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t": "100000000",
};

export type AccountResult = {
    latest_opration_time: number,
    owner_permission: any,
    account_resource: any,
    active_permission: any[],
    frozenV2: any[],
    address: string,
    balance: number, //TRX, unit : sun
    create_time: number,
    trc20: AccountTRC20Token[],
};
/**
 * Energy:
 *      currentAccountEnergy = EnergyLimit - EnergyUsed
 * Bandwidth:
 *      totalBandwidth = freeNetLimit + NetLimit;
 *      totalBandwidthUsed = NetUsed + freeNetUsed;
 *      currentAccountBandwidth = totalBandwidth - totalBandwidthUsed
 */
export type AccountResources = {
    EnergyLimit?: number, // Total energy obtained by staking
    EnergyUsed?: number, // Energy used
    freeNetLimit: number, // Total free bandwidth
    freeNetUsed?: number, // Free bandwidth used
    NetLimit?: number, // Total bandwidth obtained by staking
    NetUsed?: number, // Used amount of bandwidth obtained by staking
    assetNetUsed?: { key: string, value: number }[],
    assetNetLimit?: { key: string, value: number } [],
    tronPowerLimit?: number, // TRON Power(vote)
    tronPowerUsed?: number, // TRON Power(vote) used
    TotalNetLimit: number, // Total bandwidth can be obtained by staking by the whole network
    TotalNetWeight: number, // Total TRX staked for bandwidth by the whole network
    TotalEnergyLimit: number, // Total energy can be obtained by staking by the whole network
    TotalEnergyWeight: number, // Total TRX staked for energy by the whole network
}

export type TronContractData = {
    parameter: {
        value: {
            owner_address: string, //"410ad689150eb4a3c541b7a37e6c69c1510bcb27a4",
            amount?: number, //1000000,
            to_address?: string, //"418f723ec92f28a87c0a1d28d83210487b1af86e19"
            contract_address?: string, //"418f723ec92f28a87c0a1d28d83210487b1af86e19"
            data?: string,
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

    from?: string, // base58 strin, Txx
    to?: string,
    value?: string,
    direction?: TransactionDirection;
};

export type TronTRC20Transaction = GenericTransaction & {
    transaction_id: string,
    token_info: {
        symbol: string,
        address: string,
        decimal: number,
        name: string,
    },
    block_timestamp: number,
    from: string, // base58 strin, Txx
    to: string, // base58 strin, Txx
    type: string, // "Transfer"
    value: string,

    direction?: TransactionDirection;
    hide?: boolean;
};

// Fees paid by transaction senders/sending addresses:
// 1. Issue a TRC10 token: 1,024 TRX
// 2. Apply to be an SR candidate: 9,999 TRX
// 3. Create a Bancor transaction: 1,024 TRX
// 4. Update the account permission: 100 TRX
// 5. Activate the account: 1 TRX
// 6. Multi-sig transaction: 1 TRX
// 7. Transaction note: 1 TRX
export type TronTransactionInfo = {
    id: string,
    blockNumber: number,
    blockTimeStamp: number,
    contractResult: string[],
    contract_address?: string, //hex
    fee?: number, // 1100000: TRX, unit is sun
    receipt: {
        energy_fee?: number,
        energy_usage_total?: number,
        net_usage?: number, // Bandwidth
        net_fee?: number, // Bandwidth (0.1 TRX = 100 Bandwidth?)
        result?: string, // "SUCCESS"
    },
    log?: {
        address: string,
        topics: string[],
        data: string
    }[]
}

export type SendTransactionResult = {
    result: boolean,
    txid: string,
    transaction: {
        visible: boolean,
        txID: string,
        raw_data: TronTransactionData,
        raw_data_hex: string,
        signature: string[],
    },
};