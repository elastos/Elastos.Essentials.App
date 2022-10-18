export enum OrderStatus {
    ONGOING = 1,
    OK =  2,
    FAIL = 3,
    PartiallyCompleted = 6, // Partial completion (only for transaction orders)
}

export enum OrderType {
    CROSSCHAIN = 1,
    AGGREGATE =  2,
}

export type ChaingeResponce = {
    code: number;
    data: any;
    msg: string;
    status: number;
}

export type ChaingeSupportChain = {
    chainId: number;
    fullName: string;
    id: number;
    isActive: boolean;
    name: string;
    tokens: string[];
    url: string; // eg. "https://chainge.oss-cn-hongkong.aliyuncs.com/icon/75_ELA_color.png"
}

export type ChaingeSupportToken = {
    address: string;
    chain: string;
    decimals: number;
    name: string;
    price: string; // USD
    symbol: string;
    url: string; // eg. "https://chainge.oss-cn-hongkong.aliyuncs.com/icon/75_ELA_color.png"
}

export type ChaingeFeeToInfo = {
    address: string; // "0x01a14bc0018fc97e2fdb14ace069f50b1c44ee86" ??
    feeLevel: number;
    feeRate: number;
    id: number;
}

export type ChaingeCrossChain = {
    amountIn: number;
    amountOut: number;
    fee: number;
    gas: number;
    tokenIn: string
}

export type ChaingeAggregateQuote = {
    amountIn: number;
    amountOut: number;
    fee: number;
    gas: number;
    slippage: number;
    tokenIn: string;
    tokeOut: string;
}

export type ChaingeTx = {
    chain: string;
    event: {
        amount: string; // eg. "100000000000000000"
        readable: number; // eg. 0.1
        recipient: string; // eg. "0x456325f2ac7067234dd71e01bebe032b0255e039"
        symbol: string; // eg. 'USDT'
    };
    from: string;
    gasLimit: number;
    gasPrice: string;
    hash: string;
    id: number;
    nonce: number;
    payload: string; // base coin: payload = '0x'
    receipt: {
        errMsg: string;
        gasUsed: number;
        height: number;
        status: number;
        time: string;
    }
    to: string; //
    type: number; // base coin: '0x1', contract: '0x5'
    value: string;
}

export type ChaingeMinterParams = {
    raw: string;
    signHash: string[];
    tx: ChaingeTx;
}

export type ChaingeOrder = {
    backAddress: string;
    backAmount: string; // "0"
    backChain: string;
    backHash : string; // null
    backToken: string;
    certHash: string;
    feeLevel: string; // null
    feeToAddress: string;
    feeToAmount: string;
    feeToChain: string;
    feeToHash: string;
    feeToToken: string;
    fromAddress: string;
    fromAmount: string;
    fromChain: string;
    fromToken: string;
    sn: string; // 2
    status: OrderStatus;
    toAddress: string;
    toAmount: string;
    toChain: string;
    toHash: string;
    toToken: string;
    type: number; // 1
}

// executeCrossChain and executeAggregate
export enum ActionType {
    SENDTRANSACTION = 'signAndSendTransaction',
    AGGREGATE = 'aggregate',
    CROSSCHAIN =  'crossChain',
    WAITTRANSACTION = 'waitForTransaction',
    SUBMIT = 'submit',
}

export type ChaingeCallbackResult = {
    response: any;
    certHash?: string
}
