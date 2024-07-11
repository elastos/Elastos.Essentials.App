import { Logger } from 'src/app/logger';
import { AmountTooLowException, ChaingeException, ErrorCode, NoRouteException, Order, Response, SubmitOrderCallback, TrackOrderCallback, UnspecifiedException, UnsupportedChainException, UnsupportedTokenOrChainException } from 'src/app/multiswap/model/chainge.types';
import { ChaingeWeb3Provider } from 'src/app/multiswap/model/chaingeweb3provider';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';

export class ChaingeSwap {
    private static config = {
        signUrl: 'https://essentials-api.elastos.io/api/v1/swaps/chainge/signpayload',
        expireTime: 5000, // option. The default value is 5000 ms, range 1000 ~ 20000
        appKey: '2zF3XRCyWJxbZxgdYGzZqVqf7LKFCr2bBHgcRVU9y3kio4CRpxFKpq4KbpDvfckE'
    }

    // private chainge: Chainge = null;
    private evmAddress = null;

    private constructor() { }

    public static async create(mainCoinSubwallet: AnyMainCoinEVMSubWallet): Promise<ChaingeSwap> {
        let swap = new ChaingeSwap();

        let provider = new ChaingeWeb3Provider(mainCoinSubwallet);
        // swap.chainge = new Chainge(provider, ChaingeSwap.config);
        swap.evmAddress = mainCoinSubwallet.getCurrentReceiverAddress();

        return swap;
    }

    // Wrapper methods for getTransferToMinterRaw and submitCrossChain
    // public async executeCrossChain(feeLevel: number,
    //     fromAmount: string,
    //     fromChain: string,
    //     fromToken: string,
    //     toChain: string,
    //     progressCallback: (result: SubmitOrderCallbackResult, action: ActionType) => void,
    //     timeout = 10000): Promise<any> {
    //     if (fromChain === toChain) {
    //         let message = 'executeCrossChain: The source chain and target chain are the same, should use executeAggregate';
    //         Logger.warn('ChaingeSwap', message);
    //         throw new Error(message)
    //     }
    //     try {
    //         let ret = await this.chainge.executeCrossChain({
    //             evmAddress: this.evmAddress, feeLevel, fromAddress: this.evmAddress, fromAmount, fromChain, fromToken, toChain
    //         }, timeout, progressCallback);

    //         // TODO: Notify users
    //         if (ret && typeof ret === 'function') {
    //             ret(result => {
    //                 if (result.code === 200 && result.data.order) {
    //                     Logger.log('ChaingeSwap', 'executeCrossChain', result.data.order)
    //                     return result.data.order;
    //                 } else {
    //                     Logger.warn('ChaingeSwap', 'executeCrossChain error:', result)
    //                 }
    //             });
    //         } else {
    //             Logger.warn('ChaingeSwap', 'executeCrossChain result not function', ret)
    //         }

    //         // TODO
    //         return ret;
    //     }
    //     catch (e) {
    //         Logger.warn('ChaingeSwap', 'executeCrossChain exception', e)
    //     }
    //     return null;
    // }

    /**
     * Submit transaction hash and start cross chain liquidity swap.
     * Return Order detail
     */
    // public async executeAggregate(feeLevel: number,
    //     fromAmount: string,
    //     fromChain: string,
    //     fromToken: string,
    //     toChain: string,
    //     toToken: string,
    //     progressCallback: SubmitOrderCallback,
    //     orderProgressCallback: TrackOrderCallback,
    //     timeout = 10000): Promise<void> {

    //     if (fromToken === toToken) {
    //         let message = 'executeAggregate: The source token and target token are the same, should use executeCrossChain';
    //         Logger.error('ChaingeSwap', message);
    //         throw new Error(message);
    //     }

    //     try {
    //         // ret can be a callback that will be called many times to give us the order progress, or an error object.
    //         let ret = await this.chainge.executeAggregate({
    //             evmAddress: this.evmAddress, feeLevel, fromAddress: this.evmAddress, fromAmount, fromChain, fromToken, toChain, toToken
    //         }, timeout, progressCallback);

    //         // After returning from executeAggregate(), the order transaction has been submitted already.
    //         // The progress callback stops being called and the order tracking callback can now be used.

    //         if (ret && typeof ret === 'function') {
    //             ret(result => orderProgressCallback(result));
    //         } else {
    //             Logger.error('ChaingeSwap', 'executeAggregate error', ret);
    //             throw new ChaingeException("executeAggregate() error - request not submitted successfully? " + ret);
    //         }
    //     }
    //     catch (e) {
    //         Logger.error('ChaingeSwap', 'executeAggregate exception', e)
    //     }
    //     return null;
    // }
}