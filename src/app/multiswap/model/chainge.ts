import Chainge from '@chainge/sdk';
import { Logger } from 'src/app/logger';
import { ActionType, AggregateQuote, AmountTooLowException, ChaingeException, CrossChainQuote, ErrorCode, FeeToInfo, NoRouteException, Order, Response, SubmitOrderCallback, SubmitOrderCallbackResult, SupportedChain, SupportedToken, TrackOrderCallback, UnspecifiedException, UnsupportedTokenOrChainException } from 'src/app/multiswap/model/chainge.types';
import { ChaingeWeb3Provider } from 'src/app/multiswap/model/chaingeweb3provider';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';

export class ChaingeSwap {
    private config = {
        signUrl: 'https://essentials-api.trinity-tech.io/api/v1/swaps/chainge/signpayload',
        expireTime: 5000, // option. The default value is 5000 ms, range 1000 ~ 20000
        appKey: '2zF3XRCyWJxbZxgdYGzZqVqf7LKFCr2bBHgcRVU9y3kio4CRpxFKpq4KbpDvfckE'
    }
    private chainge: Chainge = null;
    private evmAddress = null;

    constructor(mainCoinSubwallet: AnyMainCoinEVMSubWallet) {
        let provider = new ChaingeWeb3Provider(mainCoinSubwallet)
        this.chainge = new Chainge(provider, this.config);
        this.evmAddress = mainCoinSubwallet.getCurrentReceiverAddress();
    }

    public async getSupportChains(): Promise<SupportedChain[]> {
        try {
            const result = await this.chainge.getSupportChains();
            if (result.code === 200 && result.data.chains) {
                Logger.log('ChaingeSwap', 'getSupportChains', result.data.chains)
                return result.data.chains;
            } else {
                Logger.warn('ChaingeSwap', 'getSupportChains error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getSupportChains exception', e)
        }
        return [];
    }

    public async getSupportTokens(chain: string): Promise<SupportedToken[]> {
        try {
            const result = await this.chainge.getSupportTokens(chain);
            if (result.code === 200 && result.data.tokenVos) {
                Logger.log('ChaingeSwap', 'getSupportTokens', result.data.tokenVos)
                return result.data.tokenVos;
            } else {
                Logger.warn('ChaingeSwap', 'getSupportTokens error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getSupportTokens exception', e)
        }
        return [];
    }

    public async setFeeToInfo(feeLevel: number, feeToAddress: string) {
        try {
            const result = await this.chainge.setFeeToInfo({ feeLevel, feeToAddress });
            if (result.code === 200) {
                Logger.log('ChaingeSwap', 'setFeeToInfo succeeded feeLevel:', feeLevel, ' feeToAddress:', feeToAddress)
                return true;
            } else {
                Logger.warn('ChaingeSwap', 'setFeeToInfo error', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'setFeeToInfo exception', e)
        }
        return false;
    }

    public async getFeeToInfo(): Promise<FeeToInfo> {
        try {
            const result = await this.chainge.getFeeToInfo();
            if (result.code === 200 && result.data.FeeToInfo) {
                Logger.log('ChaingeSwap', 'getFeeToInfo', result.data.FeeToInfo)
                return result.data.FeeToInfo;
            } else {
                Logger.warn('ChaingeSwap', 'getFeeToInfo error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getFeeToInfo exception', e)
        }
        return null;
    }

    // return {0:0, 1:5, 2:10, 3:15, 4:20, 5:25, 6:30, 7:35, 8:40, 9:45, 10:50}
    public async getFeeLevelInfo() {
        try {
            const result = await this.chainge.getFeeLevelInfo();
            if (result.code === 200 && result.data) {
                Logger.log('ChaingeSwap', 'getFeeLevelInfo', result.data)
                return result.data;
            } else {
                Logger.warn('ChaingeSwap', 'getFeeLevelInfo error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getFeeLevelInfo exception', e)
        }
        return null;
    }

    public async getCrossChainQuote(amount: string, feeLevel: number, fromChain: string, toChain: string, token: string): Promise<CrossChainQuote> {
        let result: Response<any>;
        try {
            result = await this.chainge.getCrossChainQuote({
                amount, feeLevel, fromChain, toChain, token
            });
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getCrossChainQuote exception', e);
            throw new UnspecifiedException();
        }

        if (result.code === ErrorCode.SUCCESS && result.data.crossChain) {
            Logger.log('ChaingeSwap', 'getCrossChainQuote', result.data.crossChain)
            return result.data.crossChain;
        } else {
            Logger.warn('ChaingeSwap', 'getCrossChainQuote error:', result);
            throw this.apiResponseToException(result);
        }
    }

    public async getAggregateQuote(feeLevel: number, fromAmount: string, fromToken: string, toChain: string, toToken: string): Promise<AggregateQuote> {
        let result: Response<any>;
        try {
            result = await this.chainge.getAggregateQuote({
                feeLevel, fromAmount, fromToken, toChain, toToken
            });
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getAggregateQuote exception', e);
            throw new UnspecifiedException();
        }

        if (result.code === ErrorCode.SUCCESS && result.data.aggregate) {
            Logger.log('ChaingeSwap', 'getAggregateQuote', result.data.aggregate)
            return result.data.aggregate;
        } else {
            Logger.warn('ChaingeSwap', 'getAggregateQuote error:', result);
            throw this.apiResponseToException(result);
        }

    }

    public async submitCrossChain(feeLevel: number, fromAmount: string, fromChain: string, fromToken: string, toChain: string): Promise<AggregateQuote> {
        try {
            const result = await this.chainge.submitCrossChain({
                evmAddress: this.evmAddress, feeLevel, fromAddress: this.evmAddress, fromAmount, fromChain, fromToken, toChain
            });
            if (result.code === 200 && result.data.aggregate) {
                Logger.log('ChaingeSwap', 'submitCrossChain', result.data.aggregate)
                return result.data.aggregate;
            } else {
                Logger.warn('ChaingeSwap', 'submitCrossChain error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'submitCrossChain exception', e)
        }
        return null;
    }

    // Wrapper methods for getTransferToMinterRaw and submitCrossChain
    public async executeCrossChain(feeLevel: number,
        fromAmount: string,
        fromChain: string,
        fromToken: string,
        toChain: string,
        progressCallback: (result: SubmitOrderCallbackResult, action: ActionType) => void,
        timeout = 10000): Promise<any> {
        if (fromChain === toChain) {
            let message = 'executeCrossChain: The source chain and target chain are the same, should use executeAggregate';
            Logger.warn('ChaingeSwap', message);
            throw new Error(message)
        }
        try {
            let ret = await this.chainge.executeCrossChain({
                evmAddress: this.evmAddress, feeLevel, fromAddress: this.evmAddress, fromAmount, fromChain, fromToken, toChain
            }, timeout, progressCallback);

            // TODO: Notify users
            if (ret && typeof ret === 'function') {
                ret(result => {
                    if (result.code === 200 && result.data.order) {
                        Logger.log('ChaingeSwap', 'executeCrossChain', result.data.order)
                        return result.data.order;
                    } else {
                        Logger.warn('ChaingeSwap', 'executeCrossChain error:', result)
                    }
                });
            } else {
                Logger.warn('ChaingeSwap', 'executeCrossChain result not function', ret)
            }

            // TODO
            return ret;
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'executeCrossChain exception', e)
        }
        return null;
    }

    /**
     * Submit transaction hash and start cross chain liquidity swap.
     * Return Order detail
     */
    public async executeAggregate(feeLevel: number,
        fromAmount: string,
        fromChain: string,
        fromToken: string,
        toChain: string,
        toToken: string,
        progressCallback: SubmitOrderCallback,
        orderProgressCallback: TrackOrderCallback,
        timeout = 10000): Promise<void> {

        if (fromToken === toToken) {
            let message = 'executeAggregate: The source token and target token are the same, should use executeCrossChain';
            Logger.error('ChaingeSwap', message);
            throw new Error(message);
        }

        try {
            // ret can be a callback that will be called many times to give us the order progress, or an error object.
            let ret = await this.chainge.executeAggregate({
                evmAddress: this.evmAddress, feeLevel, fromAddress: this.evmAddress, fromAmount, fromChain, fromToken, toChain, toToken
            }, timeout, progressCallback);

            // After returning from executeAggregate(), the order transaction has been submitted already.
            // The progress callback stops being called and the order tracking callback can now be used.

            if (ret && typeof ret === 'function') {
                ret(result => orderProgressCallback(result));
            } else {
                Logger.error('ChaingeSwap', 'executeAggregate error', ret);
                throw new ChaingeException("executeAggregate() error - request not submitted successfully? " + ret);
            }
        }
        catch (e) {
            Logger.error('ChaingeSwap', 'executeAggregate exception', e)
        }
        return null;
    }

    /**
     * Using a given sn (order id) obtained from executeCrossChain or executeAggregate,
     * fetches the current order status.
     */
    public async getOrderDetails(sn: string): Promise<Order> {
        try {
            const result = await this.chainge.getOrderDetail(sn);
            if (result.code === 200 && result.data.order) {
                Logger.log('ChaingeSwap', 'getOrderDetail', result.data.order)
                return result.data.order;
            } else {
                Logger.warn('ChaingeSwap', 'getOrderDetail error:', result)
            }
        }
        catch (e) {
            Logger.warn('ChaingeSwap', 'getOrderDetail exception', e)
        }
        return null;
    }

    private apiResponseToException(response: Response<any>): Error {
        switch (response.code) {
            case ErrorCode.NO_ROUTE: return new NoRouteException();
            case ErrorCode.TOKEN_CHAIN_NOT_SUPPORTED: return new UnsupportedTokenOrChainException();
            case ErrorCode.AGGREGATE_AMOUNT_TOO_LOW:
            case ErrorCode.CROSS_CHAIN_AMOUNT_TOO_LOW:
                return new AmountTooLowException();
            default: return new UnspecifiedException();
        }
    }

    // public async getOrderDetailByHashAndEvmAddress(chain: string, evmAddress: string, hash: string) : Promise<ChaingeOrder>{
    //     try {
    //         const result = await this.chainge.getOrderDetailByHashAndEvmAddress(chain, evmAddress, hash);
    //         if (result.code === 200 && result.data.order) {
    //             Logger.log('ChaingeSwap', 'getOrderDetailByHashAndEvmAddress', result.data.order)
    //             return result.data.order;
    //         } else {
    //             Logger.warn('ChaingeSwap', 'getOrderDetailByHashAndEvmAddress error:', result)
    //         }
    //     }
    //     catch (e) {
    //         Logger.warn('ChaingeSwap', 'getOrderDetailByHashAndEvmAddress exception', e)
    //     }
    //     return null;
    // }

    // public async getTransferToMinterParams(amount: number, chain: string, evmAddress: string, token: string): Promise<ChaingeMinterParams> {
    //     try {
    //         const result = await this.chainge.getTransferToMinterParams({
    //             amount, chain, evmAddress, fromAddress: evmAddress, token
    //         });
    //         Logger.log('ChaingeSwap', 'getTransferToMinterParams', result)
    //         if (result.code === 200 && result.data.params) {
    //             Logger.log('ChaingeSwap', 'getTransferToMinterParams', result.data.params)
    //             return result.data.params;
    //         } else {
    //             Logger.warn('ChaingeSwap', 'getTransferToMinterParams error:', result)
    //         }
    //     }
    //     catch (e) {
    //         Logger.warn('ChaingeSwap', 'getTransferToMinterParams exception', e)
    //     }
    //     return null;
    // }

    // public async getTransferToMinterRaw(amount: number, chain: string, evmAddress: string, token: string): Promise<ChaingeAggregateQuote> {
    //     try {
    //         const result = await this.chainge.getTransferToMinterRaw({
    //             amount, chain, evmAddress, fromAddress: evmAddress, token
    //         });
    //         Logger.log('ChaingeSwap', 'getTransferToMinterRaw', result)
    //         if (result.code === 200 && result.data.aggregate) {
    //             Logger.log('ChaingeSwap', 'getTransferToMinterRaw', result.data.aggregate)
    //             return result.data.aggregate;
    //         } else {
    //             Logger.warn('ChaingeSwap', 'getTransferToMinterRaw error:', result)
    //         }
    //     }
    //     catch (e) {
    //         Logger.warn('ChaingeSwap', 'getTransferToMinterRaw exception', e)
    //     }
    //     return null;
    // }
}