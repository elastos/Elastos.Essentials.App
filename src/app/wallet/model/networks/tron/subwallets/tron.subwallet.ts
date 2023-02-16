import BigNumber from 'bignumber.js';
import { Util } from 'src/app/model/util';
import { GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { Config } from '../../../../config/Config';
import { BTCTransaction } from '../../../btc.types';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';

const TRANSACTION_LIMIT = 100;

export class TronSubWallet extends MainCoinSubWallet<BTCTransaction, any> {
    private tronAddress: string = null;

    constructor(networkWallet: AnyNetworkWallet, public rpcApiUrl: string) {
        super(networkWallet, StandardCoinName.TRON);

        this.tokenDecimals = 6;
        this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals);

        this.getRootPaymentAddress();
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            await this.updateBalance();
        }, 1000);
    }

    public getMainIcon(): string {
        return this.networkWallet.network.logo;
    }

    public getSecondaryIcon(): string {
        return null
    }

    public getFriendlyName(): string {
        return 'TRX';
    }

    public getDisplayTokenName(): string {
        return 'TRX';
    }

    public async isAddressValid(address: string): Promise<boolean> {
        return await WalletUtil.isTronAddress(address);
    }

    public getRootPaymentAddress(): string {
        if (!this.tronAddress) {
            this.tronAddress = this.getCurrentReceiverAddress();
        }
        return this.tronAddress;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        return Promise.resolve([]);
    }

    protected async getTransactionName(transaction: BTCTransaction): Promise<string> {
        switch (transaction.direction) {
            case TransactionDirection.RECEIVED:
                return await "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return "wallet.coin-op-sent-token";
            case TransactionDirection.MOVED:
                return "wallet.coin-op-transfered-token";
            default:
                return "Invalid";
        }
    }

    public getAddressCount(internal: boolean): number {
        if (internal) return 0;
        else return 1;
    }

    public async getTransactionInfo(transaction: BTCTransaction): Promise<TransactionInfo> {
        const timestamp = transaction.blockTime * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? GlobalTranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

        const direction = transaction.direction;

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(transaction.realValue).dividedBy(this.tokenAmountMulipleTimes),
            confirmStatus: -1, // transaction.confirmations, // To reduce RPC calls, we do not update this value
            datetime,
            direction: direction,
            fee: (new BigNumber(transaction.fees).dividedBy(this.tokenAmountMulipleTimes)).toFixed(),
            height: transaction.blockHeight,
            memo: '',
            name: await this.getTransactionName(transaction),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: '',
            statusName: "",
            symbol: '',
            from: transaction.from,
            to: transaction.to,
            timestamp,
            txid: transaction.txid,
            type: null,
            isCrossChain: false,
            isRedPacket: false,
            subOperations: []
        };

        if (transaction.confirmations > 0) {
            transactionInfo.status = TransactionStatus.CONFIRMED;
            transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = TransactionStatus.PENDING;
            transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-pending");
        }

        if (direction === TransactionDirection.RECEIVED) {
            transactionInfo.type = TransactionType.RECEIVED;
            transactionInfo.symbol = '+';
        } else if (direction === TransactionDirection.SENT) {
            transactionInfo.type = TransactionType.SENT;
            transactionInfo.symbol = '-';
        } else if (direction === TransactionDirection.MOVED) {
            transactionInfo.type = TransactionType.TRANSFER;
            transactionInfo.symbol = '';
        }

        return transactionInfo;
    }

    // eslint-disable-next-line require-await
    protected async getTransactionIconPath(transaction: BTCTransaction): Promise<string> {
        switch (transaction.direction) {
            case TransactionDirection.RECEIVED:
                return './assets/wallet/tx/receive.svg';
            case TransactionDirection.SENT:
                return './assets/wallet/tx/send.svg';
            case TransactionDirection.MOVED:
                return './assets/wallet/tx/transfer.svg';
        }
    }

    public async update() {
        await this.getBalanceByRPC();
    }

    public async updateBalance() {
        await this.getBalanceByRPC();
    }


    /**
     * Check whether the available balance is enough.
     * @param amount unit is sotoshi
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        return await this.balance.gt(amount);
    }

    public async estimateTransferTransactionGas() {
        let feerate = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl);
        if (!feerate) {
            throw new Error("Failed to estimatesmartfee");
        }

        // TODO: Normally the data less than 1KB.
        // Fees are related to input and output.
        return Util.accMul(feerate, Config.SATOSHI);
    }

    // Ignore gasPrice, gasLimit and nonce.
    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = ""): Promise<string> {
        return Promise.resolve('');
        // let feerate = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl);
        // if (!feerate) {
        //     throw new Error("Failed to estimatesmartfee");
        // }

        // let fee;
        // let utxo: BTCUTXO[] = [];
        // let toAmount = 0;
        // if (amount.eq(-1)) {
        //     utxo = await this.getAvailableUtxo(-1);
        //     if (!utxo) return null;

        //     let feeBTC = WalletUtil.estimateBTCFee(utxo.length, 2, feerate);
        //     // let networkInfo = await GlobalBTCRPCService.instance.getnetworkinfo(this.rpcApiUrl);
        //     // if (feeBTC < networkInfo.relayfee) {
        //     //     feeBTC = networkInfo.relayfee;
        //     // }
        //     fee = Util.accMul(feeBTC, Config.SATOSHI);

        //     toAmount = Math.floor(this.balance.minus(fee).toNumber());

        // } else {
        //     // In order to estimate how much utxo is needed
        //     fee = Util.accMul(feerate, Config.SATOSHI);

        //     toAmount = Util.accMul(amount.toNumber(), Config.SATOSHI);
        //     utxo = await this.getAvailableUtxo(toAmount + fee);
        //     if (!utxo) return null;

        //     let feeBTC = WalletUtil.estimateBTCFee(utxo.length, 2, feerate)
        //     fee = Util.accMul(feeBTC, Config.SATOSHI);
        // }

        // let outputs: BTCOutputData[] = [{
        //     "Address": toAddress,
        //     "Amount": toAmount
        // }]

        // for (let i = 0; i < utxo.length; i++) {
        //     if (!utxo[i].utxoHex) {
        //         let rawtransaction = await GlobalBTCRPCService.instance.getrawtransaction(this.explorerApiUrl, utxo[i].txid);
        //         if (rawtransaction) {
        //             utxo[i].utxoHex = rawtransaction.hex;
        //         } else {
        //             // TODO:
        //             Logger.log('wallet', 'GlobalBTCRPCService getrawtransaction error');
        //             return null;
        //         }
        //     }
        // }

        // Logger.log('wallet', 'createBTCTransaction  toAddress:', toAddress, ' amount:', toAmount)
        // return (this.networkWallet.safe as any as TronSafe).createBTCPaymentTransaction(
        //     utxo,
        //     outputs,
        //     this.tronAddress,
        //     feerate.toString(),
        //     fee);
    }

    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        return await this.sendRawTransaction(transaction);
    }

    protected async sendRawTransaction(payload: string) {
        return await GlobalBTCRPCService.instance.sendrawtransaction(this.rpcApiUrl, payload)
    }

    // ********************************
    // Private
    // ********************************

    /**
     * Get balance by RPC
     */
    public async getBalanceByRPC() {
        await this.updateTronSubWalletInfo();
    }

    /**
     * Update balance and transaction list.
     */
    private async updateTronSubWalletInfo() {
        // Get the latest info.
        let accountInfo = await GlobalTronGridService.instance.account(this.rpcApiUrl, this.tronAddress);
        if (accountInfo) {
            if (accountInfo.balance) {
                // the unconfirmedBalance is negative for unconfirmed sending transaction.
                this.balance = new BigNumber(accountInfo.balance);
                await this.saveBalanceToCache();
            }
        }
    }

    async getTransactionDetails(txid: string): Promise<any> {
        // return await GlobalBTCRPCService.instance.getrawtransaction(this.explorerApiUrl, txid);
    }

    // BTC chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableEarnProviders(): EarnProvider[] {
        return [];
    }

    // BTC chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableSwapProviders(): SwapProvider[] {
        return [];
    }

    // BTC chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableBridgeProviders(): BridgeProvider[] {
        return [];
    }
}
