export enum OrderStatus {
    ONGOING = 1,
    COMPLETED = 2,
    FAILED = 3,
    PartiallyCompleted = 6, // Partial completion (only for transaction orders)
}

export enum OrderType {
    CROSSCHAIN = 1,
    AGGREGATE = 2,
}

export enum ErrorCode {
    SUCCESS = 0,
    VALIDATION_FAILED = 31010, // msg: "Validation failed!"
    CHAIN_NOT_SUPPORTED = 31005, // msg: "Not support this chain!"
    TOKEN_CHAIN_NOT_SUPPORTED = 31006, // msg: "Not support this chain and token!"
    NO_ROUTE = 3, // msg: "not find best route"
    AGGREGATE_AMOUNT_TOO_LOW = 31031, // msg: "Get aggregate quote error! Amount can't cover gas and fee!"
    CROSS_CHAIN_AMOUNT_TOO_LOW = 31071 // msg: "Get cross chain quote error! Amount can't cover gas and fee!"
}

// export enum ErrorCode {
//     SUCCESS = 200,
//     VALIDATION_FAILED = 31010, // msg: "Validation failed!"
//     CHAIN_NOT_SUPPORTED = 31005, // msg: "Not support this chain!"
//     TOKEN_CHAIN_NOT_SUPPORTED = 31006, // msg: "Not support this chain and token!"
//     NO_ROUTE = 31037, // msg: "Get aggregate quote error! Error msg !" (according to chainge team, this happens when no DEX is available to route tokens)
//     AGGREGATE_AMOUNT_TOO_LOW = 31031, // msg: "Get aggregate quote error! Amount can't cover gas and fee!"
//     CROSS_CHAIN_AMOUNT_TOO_LOW = 31071 // msg: "Get cross chain quote error! Amount can't cover gas and fee!"
// }

export type Response<T> = {
    code: ErrorCode;
    data: T;
    msg: string;
    status: number;
}

export type SupportedChain = {
    chainIndex: number;
    fullName: string;
    nickName: string,
    baseCoin: string,
    decimals: number,
    poll: number,
    confirmations: number,
    family: number,
    sigMethod: number,
    network: string, // '20'
    bip44Path: string, // "m/44'/60'/0'/0/0",
    publicEndpoint: string,
    privateEndpoint: string,
    scanUrl: string, // 'https://eth.elastos.io',
    needNonce: boolean,
    disabled: boolean,
    delisted: boolean,
    evmIsLegacy: boolean,
    builtInMinterProxy: string,
    builtInMinterProxyV2: string, // '0xc66e5e278b24adbb638cba30d6e6de697f73a774',
    builtInSwapProxy: string,
    weth: string, // '0x517e9e5d46c1ea8ab6f78677d6114ef47f71f6c4',
    gasPriceAmplifier: string;
    swapGasMin: string, // '0.0001',
    swapGasMax: string, //'0.001'
}

// getAssetsByChain
export type SupportedTokenByChain = {
    index: number,
    name: string,
    symbol: string,
    decimals: number,
    contractAddress: string,
    cmcid: number,
    burnable?: boolean //true means tokens is wrapped by Chainge
}

// getAssets
export type SupportedToken = {
    index: number,
    name: string,
    symbol: string,
    cmcid: number,
    delisted?: boolean //true means current token of this chain is delisted
    visible?: boolean
    contracts : {
        [chain: string]: {
            address: string,
            decimals: number,
            burnable?: boolean,
            delisted?: boolean
        },
    }
}

export type ChainGasUsd = {
    chain: string,
    chainId: string,
    basecoin: number,
    token: number,
    dex: number,
}


export type FeeToInfo = {
    address: string; // "0x01a14bc0018fc97e2fdb14ace069f50b1c44ee86" ??
    feeLevel: number;
    feeRate: number;
    id: number;
}

export type CrossChainQuote = {
    price: string;
    outAmount: string; // Unit wei
    outAmountUsd: string; // Trade amount must exceed $5
    serviceFee: string; // Unit wei
    gasFee: string; // Unit wei
    serviceFeeRate: string;
}

// return from api
export type AggregateQuote = {
    aggregator: string;     // on which dex the swap will take place; could be 1inch,Kyber,OpenOcean or ChaingeDex
    chain: string;          // chain id on which the swap will take place
    chainDecimal: number;   // decimals of chain basecoin
    gasFee: number;         // gas fee charged in toToken, '400000'
    outAmount: string;      // expected output amount
    outAmountUsd: string;   // expected output amount in USD value
    serviceFee: string;     // service fee charged in toToken
    serviceFeeRate: string; // '8'
    slippage: string;       // '1' = 1%, denominator is 10,000
    routeSummary?: string;  // used when aggregator=Kyber
    priceImpact: string;    // "-8.39"
}


export type Transaction = {
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

export type MinterParams = {
    raw: string;
    signHash: string[];
    tx: Transaction;
}

export type Order = {
    backAddress: string;
    backAmount: string; // "0"
    backChain: string;
    backHash: string; // null
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
    CROSSCHAIN = 'crossChain',
    WAITTRANSACTION = 'waitForTransaction',
    SUBMIT = 'submit',
}

type SignAndSendTransactionResponse = {
    response: 'start' | 'end';
}

type CrossChainResponse = {
    // TODO
}

type AggregateResponse = {
    certHash: string;
    evmAddress: string;
    feeLevel: number;
    fromAddress: string;
    fromAmount: string;
    fromChain: string;
    fromToken: string;
    toChain: string;
    toToken: string;
}

type WaitForTransactionResponse = {
    status: 'start' | 'end';
    result?: any; // EVM transaction payload
}

type SubmitResponse = {
    certHash: string;
    response: Response<{
        sn: string; // eg: "AG2060620221020005405509"
        status: OrderStatus;
    }>;
}

export type SubmitOrderCallbackResult = {
    certHash?: string
    response: SignAndSendTransactionResponse | CrossChainResponse | AggregateResponse | WaitForTransactionResponse | SubmitResponse;
}

export type TrackOrderCallbackResult = Response<{
    order: Order
}>;

/**
 * Callback called while a request to executeAggregate() or to executeCrossChain() is started.
 * During this time, this callback can be called severla ti;es to give status about the submission on the source chain.
 * Once the order has been submitted on the source chain, executeAggregate() and executeCrossChain() return and provide a different
 * callback to follow the order progress overall. That second callback gives a status 2 (COMPLETED) when the tokens have fully arrived
 * on the destination chain.
 */
export type SubmitOrderCallback = (result: SubmitOrderCallbackResult, action: ActionType) => void;

export type TrackOrderCallback = (result: TrackOrderCallbackResult) => void;

export class ChaingeException extends Error { }
export class UnspecifiedException extends ChaingeException { }
export class UnsupportedChainException extends ChaingeException { }
export class UnsupportedTokenOrChainException extends ChaingeException { }
export class AmountTooLowException extends ChaingeException { }
export class NoRouteException extends ChaingeException { }