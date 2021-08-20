import { Component, OnInit } from '@angular/core';
import { WalletManager } from '../../services/wallet.service';
import { Native } from '../../services/native.service';
import Web3 from 'web3';
import { CoinTransferService, Transfer } from '../../services/cointransfer.service';
import { StandardCoinName } from '../../model/Coin';
import { MasterWallet } from '../../model/wallets/MasterWallet';
import { ChainId, Currency, CurrencyAmount, JSBI, Pair, Percent, Route, Router, Token, TokenAmount, Trade, WETH, ETHER, Fetcher, TradeType } from '@uniswap/sdk';
import { TranslateService } from '@ngx-translate/core';
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
import { LocalStorage } from '../../services/storage.service';
import { JsonRpcProvider } from "@ethersproject/providers";
import { JsonRpcResponse, JsonRpcPayload } from "web3-core-helpers";
import { BigNumber } from 'bignumber.js';
import { ETHChainSubWallet } from '../../model/wallets/ETHChainSubWallet';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { EssentialsWeb3Provider } from 'src/app/model/essentialsweb3provider';
import { Logger } from 'src/app/logger';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';

const BIPS_BASE = JSBI.BigInt(10000) // Fixed, don't touch
const INITIAL_ALLOWED_SLIPPAGE = 50 // 0.5% price slippage allowed. If more than this (price changed a lot between 2 blocks), transaction will be cancelled
const DEFAULT_DEADLINE_FROM_NOW = 60 * 20 // 20 minutes, denominated in seconds

class InternalWeb3Provider extends EssentialsWeb3Provider {
    private elaEthSubwallet: ETHChainSubWallet;

    constructor(private walletManager: WalletManager, private masterWallet: MasterWallet) {
        super(ElastosApiUrlType.ETHSC_RPC);
        this.elaEthSubwallet = this.masterWallet.getSubWallet(StandardCoinName.ETHSC) as ETHChainSubWallet;
    }

    protected async sendTransaction(payload: JsonRpcPayload, callback: (error: Error, result?: JsonRpcResponse) => void) {
        // We overwrite the default implementation of sendTransaction() so that instead of sending an intent to
        // ourself, we directly sign and send the transaction from here.

        Logger.log('wallet', "InternalWeb3Provider - Send transaction request with payload:", payload);

        let nonce = await this.elaEthSubwallet.getNonce();
        const rawTx =
            await this.walletManager.spvBridge.createTransferGeneric(
                this.masterWallet.id,
                StandardCoinName.ETHSC,
                payload.params[0].to,
                payload.params[0].value,
                0, // WEI
                payload.params[0].gasPrice,
                0, // WEI
                payload.params[0].gas, // TODO: gasLimit
                payload.params[0].data,
                nonce
            );

        Logger.log('wallet', 'Created raw ESC transaction:', rawTx);

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWallet.id,
            elastosChainCode: this.elaEthSubwallet.id,
            rawTransaction: rawTx,
            payPassword: '',
            //intentId: this.intentTransfer.intentId, // TODO: currently signAndSendRawTransaction() sends an intent response. We must avoid this
        });

        let publicationResult = await this.elaEthSubwallet.signAndSendRawTransaction(rawTx, transfer, false);
        Logger.log('wallet', "Publication result:", publicationResult);
        if (publicationResult.published) {
            callback(null, {
                jsonrpc: "2.0",
                id: payload.id as number,
                result: publicationResult.txid // 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available.
            });
        }
        else {
            callback(new Error("Transaction publication cancelled or errored."));
        }
    }
}

@Component({
    selector: 'app-swap-test',
    templateUrl: './swap-test.page.html',
    styleUrls: ['./swap-test.page.scss'],
})
export class SwapTestPage implements OnInit {
    private masterWallet: MasterWallet;
    public status: string[] = [];

    constructor(public walletManager: WalletManager,
        private coinTransferService: CoinTransferService,
        private storage: LocalStorage,
        private globalNetworksService: GlobalNetworksService,
        public native: Native) {
        void this.init();
    }

    ngOnInit() {
    }

    async init() {
        let networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
        let currentMasterWalletId = await this.storage.getCurMasterId(networkTemplate);
        Logger.log('wallet', "currentMasterWalletId", currentMasterWalletId);
        this.masterWallet = this.walletManager.getMasterWallet(currentMasterWalletId.masterId);
    }

    public async swapELAToDMA() {
        this.status = [];
        this.status.push("Swap ELA to DMA: starting");
        await this.doSwap();
        this.status.push("Swap ELA to DMA: ended");
    }

    public async swapDMAToELA() {
        this.status = [];
        this.status.push("Swap DMA to ELA: starting");
        await this.doSwap();
        this.status.push("Swap DMA to ELA: ended");
    }

    /**
     * ELA Mainnet
     *      UniswapV2 Factory: 0xFc09C4A466A4FBa6bE80009cee63E24C2F168371
     *      wELA: 0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4
     *      Uniswap V2 Router: 0x1FF9598aBCBbC2F3A9B15261403459215b352e2b
     */
    doSwap(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise<void>(async (resolve)=>{
            let provider = new InternalWeb3Provider(this.walletManager, this.masterWallet);
            let web3 = new Web3(provider);
            let routerContract = new web3.eth.Contract(IUniswapV2Router02ABI as any, "0x1FF9598aBCBbC2F3A9B15261403459215b352e2b");
            const DMA = new Token(ChainId.MAINNET, '0x9c22cec60392cb8c87eb65c6e344872f1ead1115', 18, 'DMA', 'DMA token')

            let currencyIn = Currency.ETHER;
            let currencyOut = DMA; // Can be ETHER or a Token
            let sourceAmount = web3.utils.toWei("0.001"); // 0.01 ELAETH => will get about 9 DMA
            let currencyAmountIn = CurrencyAmount.ether(sourceAmount); // Can be CurrencyAmount.ether() or a new TokenAmount(DAI, "2");
            Logger.log('wallet', "currencyAmountIn:", currencyAmountIn)

            let etherjsTrinityProvider = new JsonRpcProvider({
                url: "https://api.elastos.io/eth" // TODO: change according to network in settings
            });

            this.status.push("Fetching pair data");
            const pair = await Fetcher.fetchPairData(DMA, WETH[DMA.chainId], etherjsTrinityProvider);
            Logger.log('wallet', "PAIR:", pair);

            const route = new Route([pair], WETH[DMA.chainId])
            Logger.log('wallet', "ROUTE MIDPRICE:", route.midPrice.toSignificant(6)) // 201.306
            Logger.log('wallet', "ROUTE INVERT MIDPRICE:", route.midPrice.invert().toSignificant(6)) // 0.00496756

            this.status.push("Computing trade");
            let trade = Trade.bestTradeExactIn([pair], currencyAmountIn, currencyOut, { maxHops: 3, maxNumResults: 1 })[0] || null;
            Logger.log('wallet', "TRADE:", trade);

            let accountAddress = await this.getEthAddress();

            Logger.log('wallet', "Computing ROUTE CALL PARAMS");
            let callParams = Router.swapCallParameters(trade, {
                feeOnTransfer: false,
                allowedSlippage: new Percent(JSBI.BigInt(INITIAL_ALLOWED_SLIPPAGE), BIPS_BASE),
                recipient: accountAddress, // Ourself - we will receive the swapped tokens.
                ttl: DEFAULT_DEADLINE_FROM_NOW // A few minutes before invalidating our swap request, so we do'nt wait for it forever
            });

            Logger.log('wallet', "CALLPARAMS: ", callParams);

            let gasPrice = await web3.eth.getGasPrice();
            Logger.log('wallet', "GAS PRICE:", gasPrice);

            let contractMethod = routerContract.methods[callParams.methodName](...callParams.args);

            let gasLimit = 1000000;
            try {
                // Estimate gas cost
                gasLimit = await contractMethod.estimateGas({
                    gas: 1000000,
                    value: callParams.value
                });
            } catch (error) {
                Logger.log('wallet', 'estimateGas error:', error);
            }

            let transactionParams = {
                from: accountAddress,
                gasPrice: gasPrice,
                gas: gasLimit,
                value: callParams.value
            };

            this.status.push("Calling contract SWAP method");
            contractMethod.send(transactionParams)
                .on('transactionHash', (hash) => {
                    this.status.push("Transaction was published - transactionHash:" + hash);
                })
                .on('receipt', (receipt) => {
                    //Logger.log('wallet', "receipt", receipt);
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.status.push("Got transaction confirmation:"+confirmationNumber);
                    resolve();
                })
                .on('error', (error, receipt) => {
                    this.status.push("Transaction error:"+error);
                    resolve();
                });
        });
    }

    private getEthAddress(): Promise<string> {
        return this.masterWallet.getSubWallet(StandardCoinName.ETHSC).createAddress();
    }

    /**
     * Returns the total transaction cost, ELA value + fees, in ELA.
     *
     * Input values are in WEI
     */
    public getTotalTransactionCostInELA(): { totalAsBigNumber: BigNumber, total: string, valueAsBigNumber: BigNumber, value: string, feesAsBigNumber: BigNumber, fees: string } {
        let weiElaRatio = new BigNumber("1000000000000000000");

        let elaEthValue = new BigNumber(this.coinTransferService.payloadParam.value).dividedBy(weiElaRatio);
        let fees = new BigNumber(this.coinTransferService.payloadParam.gas).multipliedBy(new BigNumber(this.coinTransferService.payloadParam.gasPrice)).dividedBy(weiElaRatio);
        let total = elaEthValue.plus(fees);

        //Logger.log('wallet', "elaEthValue", elaEthValue.toString())
        //Logger.log('wallet', "fees/gas", fees.toString());
        //Logger.log('wallet', "total", total.toString());

        return {
            totalAsBigNumber: total,
            total: total.toString(),
            valueAsBigNumber: elaEthValue,
            value: elaEthValue.toString(),
            feesAsBigNumber: fees,
            fees: fees.toString()
        }
    }
}
