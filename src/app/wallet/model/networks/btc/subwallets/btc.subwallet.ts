import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { Config } from '../../../../config/Config';
import { BTCOutputData, BTCTransaction, BTCUTXO } from '../../../btc.types';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { NetworkAPIURLType } from '../../base/networkapiurltype';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { BTCSafe } from '../safes/btc.safe';

const TRANSACTION_LIMIT = 50;

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class BTCSubWallet extends MainCoinSubWallet<BTCTransaction, any> {
    private legacyAddress: string = null;
    private transactionsList: string[] = null;
    private totalTransactionCount = 0;
    private explorerApiUrl = null;

    constructor(networkWallet: AnyNetworkWallet, public rpcApiUrl: string) {
        super(networkWallet, StandardCoinName.BTC);

        this.tokenDecimals = 8;
        this.tokenAmountMulipleTimes = Config.SELAAsBigNumber;

        this.getRootPaymentAddress();

        this.explorerApiUrl = this.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.NOWNODE_EXPLORER);
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

    public async isAddressValid(address: string): Promise<boolean> {
        return await WalletUtil.isBTCAddress(address);
    }

    public getRootPaymentAddress(): string {
        if (!this.legacyAddress) {
            this.legacyAddress = this.getCurrentReceiverAddress();
        }
        return this.legacyAddress;
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

    public getTxidList() {
        return this.transactionsList;
    }

    //satoshi
    public async getAvailableUtxo(amount: number) {
        let utxoArrayForSDK: BTCUTXO[] = [];
        let utxoArray: BTCUTXO[] = await GlobalBTCRPCService.instance.getUTXO(this.explorerApiUrl, this.legacyAddress);
        let getEnoughUTXO = false;
        if (utxoArray) {
            let totalAmount = 0;
            // Use the old utxo first.
            for (let i = utxoArray.length - 1; i >= 0; i--) {
                utxoArrayForSDK.push(utxoArray[i]);

                totalAmount += parseInt(utxoArray[i].value);
                if ((amount != -1) && (totalAmount >= amount)) {
                    Logger.log('wallet', 'Get enough btc utxo for :', amount);
                    getEnoughUTXO = true;
                    break;
                }
            }
        }

        if (!getEnoughUTXO && (amount != -1)) {
            Logger.warn('wallet', 'Utxo is not enough for ', amount, utxoArrayForSDK)
        }
        return utxoArrayForSDK;
    }

    public async estimateTransferTransactionGas() {
        let feerate = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl);
        if (!feerate) {
            Logger.warn('wallet', 'BTCSubWallet: Can not get the feerate');
            return null;
        }

        // TODO: Normally the data less than 1KB.
        // Fees are related to input and output.
        return Util.accMul(feerate, Config.SATOSHI);
    }

    // Ignore gasPrice, gasLimit and nonce.
    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = ""): Promise<string> {
        let feerate = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl);
        if (!feerate) {
            Logger.warn('wallet', 'BTCSubWallet: Can not get the feerate');
            return null;
        }

        // TODO: Normally the data less than 1KB.
        // Fees are related to input and output.
        let fee = Util.accMul(feerate, Config.SATOSHI);

        let utxo: BTCUTXO[] = [];
        let toAmount = 0;
        if (amount.eq(-1)) {
            utxo = await this.getAvailableUtxo(-1);
            if (!utxo) return null;

            let feeBTC = WalletUtil.estimateBTCFee(utxo.length, 1, feerate)
            fee = Util.accMul(feeBTC, Config.SATOSHI);

            toAmount = Math.floor(this.balance.minus(fee).toNumber());
        } else {
            toAmount = Util.accMul(amount.toNumber(), Config.SATOSHI);
            utxo = await this.getAvailableUtxo(toAmount + fee);
            if (!utxo) return null;

            let feeBTC = WalletUtil.estimateBTCFee(utxo.length, 2, feerate)
            fee = Util.accMul(feeBTC, Config.SATOSHI);
        }

        let outputs: BTCOutputData[] = [{
            "Address": toAddress,
            "Amount": toAmount
        }]

        for (let i = 0; i < utxo.length; i++) {
            if (!utxo[i].utxoHex) {
                let rawtransaction = await GlobalBTCRPCService.instance.getrawtransaction(this.explorerApiUrl, utxo[i].txid);
                if (rawtransaction) {
                    utxo[i].utxoHex = rawtransaction.hex;
                } else {
                    // TODO:
                    Logger.log('wallet', 'GlobalBTCRPCService getrawtransaction error');
                    return null;
                }
            }
        }

        Logger.log('wallet', 'createBTCTransaction  toAddress:', toAddress, ' amount:', toAmount)
        return (this.networkWallet.safe as any as BTCSafe).createBTCPaymentTransaction(
            utxo,
            outputs,
            this.legacyAddress,
            feerate.toString(),
            fee);
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
        await this.updateBTCSubWalletInfo();
    }

    /**
     * Update balance and transaction list.
     */
    private async updateBTCSubWalletInfo() {
        // Get the latest info.
        let btcInfo = await GlobalBTCRPCService.instance.address(this.explorerApiUrl, this.legacyAddress, TRANSACTION_LIMIT, 1);
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
        return await GlobalBTCRPCService.instance.getrawtransaction(this.explorerApiUrl, txid);
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
