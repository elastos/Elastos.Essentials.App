import { GenericTransaction, TransactionDirection } from "./tx-providers/transaction.types";

export enum ResourceType {
    BANDWIDTH = 'BANDWIDTH',
    ENERGY = 'ENERGY',
  }

export type RequestResponse = {
    data: any;
    success: boolean;
    meta: {
        at: number,
        page_size : number,
    };
}

export type UnfrozenV2 = {
    unfreeze_amount: number,
    unfreeze_expire_time: number,
}

export type AccountTRC20Token = {
    [tokenId: string]: string // "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t": "100000000",
};

export type AccountResult = {
    latest_opration_time: number,
    owner_permission: any,
    account_resource: {
        frozen_balance_for_energy: {
            frozen_balance: number,
            expire_time: number,
        },
        latest_consume_time_for_energy: number,
    },
    active_permission: any[],
    frozen: {
        frozen_balance: number, // frozen balance for bandwidth
        expire_time: number,
    }[],
    frozenV2: {
      amount?: number, // sun
      type?: string,
    }[],
    assetV2: any[], // TRC10 tokens
    address: string,
    balance: number, //TRX, unit : sun
    create_time: number,
    net_usage: number,
    free_net_usage: number,
    trc20: AccountTRC20Token[],
    unfrozenV2?: UnfrozenV2[],
    latest_consume_free_time: number,
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
            // FreezeBalanceContract
            frozen_balance?: number, // Sun
            frozen_duration?: number, // Day
            resource?: number, // 0:BANDWIDTH, 1: ENERGY
            resource_type?: string, // "ENERGY", "BANDWIDTH"
            resource_value?: number, // 0:BANDWIDTH, 1: ENERGY
            unfreeze_balance?: number, // stake v2
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
    fee_limit?: number,
}

export type TronTransaction = GenericTransaction & {
    ret: {
        contractRet: string, //"SUCCESS", "OUT_OF_ENERGY"
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
    unfreeze_amount?: number,

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
    }[],
    withdraw_expire_amount?: number;
}

// if bandwith/trx is not enough, return {
//  code: "BANDWITH_ERROR",
//  message: "4163636f756e74207265736f7572636520696e73756666696369656e74206572726f722e",
//  txid: string
// }
export type SendTransactionResult = {
    result?: boolean,
    txid: string,
    transaction?: {
        visible: boolean,
        txID: string,
        raw_data: TronTransactionData,
        raw_data_hex: string,
        signature: string[],
    },
    code?: string,
    message?: string, // hex
};

export type triggerConstantContractResult = {
    result: {
        result?: boolean,
        code?: string,
        message?: string, // hex
    },
    constant_result?: string[],
    energy_used?: number,
    transaction?: {
        visible: boolean,
        txID: string,
        raw_data: TronTransactionData,
        raw_data_hex: string,
    },
};

export type contractState = {
    // the current maintenance period number.
    update_cycle: number,
    // the origin energy consumption of the contract in current maintenance period.
    energy_usage: number,
    // the penalty factor of the contract in current maintenance period,
    // the precision is 10000, energy_factor = 1000 means the penalty percentage is 10%.
    energy_factor: number,
}

export type contractInfo = {
    contract_state: contractState,
    runtimecode: string,
    smart_contract: {
        bytecode: string,
        consume_user_resource_percent: number,
        name: string,
        origin_address: string,
        abi: any,
        origin_energy_limit: number,
        contract_address: string,
        code_hash: string,
    }
}
