import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { Config } from '../../../config/Config';
import { BTCTransaction, BTCUTXO } from '../../btc.types';
import { StandardCoinName } from '../../coin';
import { BridgeProvider } from '../../earn/bridgeprovider';
import { EarnProvider } from '../../earn/earnprovider';
import { SwapProvider } from '../../earn/swapprovider';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType, UtxoForSDK } from '../../providers/transaction.types';
import { WalletUtil } from '../../wallet.util';
import { NetworkWallet } from '../networkwallet';
import { StandardSubWallet } from '../standard.subwallet';

const TRANSACTION_LIMIT = 50;

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class BTCSubWallet extends StandardSubWallet<BTCTransaction> {
    private legacyAddress: string = null;
    private transactionsList: string[] = null;
    private totalTransactionCount = 0;

    constructor(
        networkWallet: NetworkWallet,
        public rpcApiUrl: string
    ) {
        super(networkWallet, StandardCoinName.BTC);

        this.tokenDecimals = 8;
        this.tokenAmountMulipleTimes = Config.SELAAsBigNumber;

        void this.createAddress();
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
        return 'BTC';
    }

    public getDisplayTokenName(): string {
        return 'BTC';
    }

    public async createAddress(): Promise<string> {
        if (!this.legacyAddress) {
            let legacyAddresses = await this.masterWallet.walletManager.spvBridge.getLegacyAddresses(this.masterWallet.id, 0, 1, false);
            if (legacyAddresses) {
                this.legacyAddress = legacyAddresses[0];
            }
        }
        return this.legacyAddress;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        return Promise.resolve([]);
    }

    protected async getTransactionName(transaction: BTCTransaction, translate: TranslateService): Promise<string> {
        return await '';
    }

    public getAddressCount(internal: boolean): number {
        if (internal) return 0;
        else return 1;
    }

    public async getTransactionInfo(transaction: BTCTransaction, translate: TranslateService): Promise<TransactionInfo> {
        const timestamp = transaction.blockTime * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

        const direction = transaction.direction;

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(transaction.realValue).dividedBy(this.tokenAmountMulipleTimes),
            confirmStatus: -1, // transaction.confirmations, // To reduce RPC calls, we do not update this value
            datetime,
            direction: direction,
            fee: (new BigNumber(transaction.fees).dividedBy(this.tokenAmountMulipleTimes)).toString(),
            height: transaction.blockHeight,
            memo: '',
            name: await this.getTransactionName(transaction, translate),
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
        };

        if (transaction.confirmations > 0) {
            transactionInfo.status = TransactionStatus.CONFIRMED;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = TransactionStatus.PENDING;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-pending");
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
                return './assets/wallet/buttons/receive.png';
            case TransactionDirection.SENT:
                return './assets/wallet/buttons/send.png';
            case TransactionDirection.MOVED:
                return './assets/wallet/buttons/transfer.png';
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

    public getTxidList() {
        return this.transactionsList;
    }

    //satoshi
    public async getAvailableUtxo(amount: number) {
        let utxoArray: BTCUTXO[] = await GlobalBTCRPCService.instance.getUTXO(this.rpcApiUrl, this.legacyAddress);

        let utxoArrayForSDK = [];
        let getEnoughUTXO = false;
        if (utxoArray) {
            let totalAmount = 0;
            // Use the old utxo first.
            for (let i = utxoArray.length - 1; i >= 0; i--) {
                let utxoForSDK: UtxoForSDK = {
                    Address: this.legacyAddress,
                    Amount: utxoArray[i].value,
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoForSDK);

                totalAmount += parseInt(utxoArray[i].value);
                if ((amount != -1) && (totalAmount >= amount)) {
                    Logger.log('wallet', 'Get enough btc utxo for :', amount);
                    getEnoughUTXO = true;
                    break;
                }
            }
        }

        if (!getEnoughUTXO) {
            Logger.warn('wallet', 'Utxo is not enough for ', amount, utxoArrayForSDK)
        }
        return utxoArrayForSDK;
    }

    // Ignore gasPrice, gasLimit and nonce.
    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = "", gasPrice: string = null, gasLimit: string = null, nonce: number = null): Promise<string> {
        let feerate = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl);

        // TODO: Normally the data less than 1KB.
        // Fees are related to input and output.
        let fee = Util.accMul(feerate, Config.SATOSHI);

        let toAmount = 0;
        if (amount.eq(-1)) {
            toAmount = Math.floor(this.balance.minus(fee).toNumber());
        } else {
            toAmount = Util.accMul(amount.toNumber(), Config.SATOSHI);
        }

        let outputs = [{
            "Address": toAddress,
            "Amount": toAmount.toString()
        }]

        let utxo = await this.getAvailableUtxo(toAmount + fee);
        if (!utxo) return;

        Logger.log('wallet', 'createBTCTransaction  toAddress:', toAddress, ' amount:', toAmount)

        return await this.masterWallet.walletManager.spvBridge.createBTCTransaction(
            this.masterWallet.id,
            JSON.stringify(utxo),
            JSON.stringify(outputs),
            this.legacyAddress,
            feerate.toString());
    }

    public async publishTransaction(transaction: string): Promise<string> {
        let obj = JSON.parse(transaction);
        return await this.sendRawTransaction(obj.Data);
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
        await this.updateBTCSubWalletInfo();
    }

    /**
     * Update balance and transaction list.
     */
    private async updateBTCSubWalletInfo() {
        // Get the latest info.
        let btcInfo = await GlobalBTCRPCService.instance.address(this.rpcApiUrl, this.legacyAddress, TRANSACTION_LIMIT, 1);
        if (btcInfo) {
            if (btcInfo.balance) {
                // the unconfirmedBalance is negative for unconfirmed sending transaction.
                this.balance = new BigNumber(btcInfo.balance).plus(btcInfo.unconfirmedBalance);
                await this.saveBalanceToCache();
            }
            if (btcInfo.txids) {
                this.transactionsList = btcInfo.txids;
            }

            this.totalTransactionCount = btcInfo.txs;
        }
    }

    async getTransactionDetails(txid: string): Promise<any> {
        return await GlobalBTCRPCService.instance.getrawtransaction(this.rpcApiUrl, txid);
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
