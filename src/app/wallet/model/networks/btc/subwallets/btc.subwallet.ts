import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { BTCFeeSpeed, GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { Config } from '../../../../config/Config';
import { BTCOutputData, BTCTransaction, BTCUTXO, BitcoinAddressType } from '../../../btc.types';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { NetworkAPIURLType } from '../../base/networkapiurltype';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { btcToSats, satsToBtc } from '../conversions';
import { AnyBTCNetworkWallet } from '../networkwallets/btc.networkwallet';
import { BTCSafe } from '../safes/btc.safe';

const TRANSACTION_LIMIT = 50;

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class BTCSubWallet extends MainCoinSubWallet<BTCTransaction, any> {
    private btcAddress: string = null;
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

    public getUniqueIdentifierOnNetwork(): string {
        return this.id + '-' + (this.networkWallet as AnyBTCNetworkWallet).bitcoinAddressType;
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
        switch ((this.networkWallet as AnyBTCNetworkWallet).bitcoinAddressType) {
            case BitcoinAddressType.Legacy:
                return 'Legacy';
            case BitcoinAddressType.NativeSegwit:
                return 'Native Segwit'
            case BitcoinAddressType.Taproot:
                return "Taproot"
            default:
                return 'BTC';
        }
    }

    public getDisplayTokenName(): string {
        return 'BTC';
    }

    public async isAddressValid(address: string): Promise<boolean> {
        return await WalletUtil.isBTCAddress(address);
    }

    public getRootPaymentAddress(): string {
        if (!this.btcAddress) {
            this.btcAddress = this.getCurrentReceiverAddress();
        }
        return this.btcAddress;
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

    public getTxidList() {
        return this.transactionsList;
    }

    /**
     * Computes and returns the list of UTXO we have to use to be able to spend the given amount.
     */
    public async getAvailableUtxo(amount: number): Promise<BTCUTXO[]> {
        let utxoArray: BTCUTXO[] = await GlobalBTCRPCService.instance.getUTXO(this.explorerApiUrl, this.btcAddress);

        if (amount == -1)
            return utxoArray;

        let payableUTXOs: BTCUTXO[] = [];
        let totalAmount = 0;

        // Sort UTXOs by value in descending order
        let sortedUtxos = utxoArray.sort((a, b) => parseInt(b.value) - parseInt(a.value));

        for (const utxo of sortedUtxos) {
            if (totalAmount >= amount) {
                // We have enough funds
                break;
            }
            payableUTXOs.push(utxo);
            totalAmount += parseInt(utxo.value);
        }

        if (totalAmount < amount) {
            Logger.error('wallet', 'BTCSubWallet: Utxo is not enough for ', amount, payableUTXOs);
            return null;
        } else {
            return payableUTXOs;
        }
    }

    /**
     * Computes the list of UTXOs, and the total fee user has to pay, for a given
     * amount of BTC and a fee rate.
     */
    private async getUTXOsAndFee(amountBTC: BigNumber, feeInSatPerKB: number) {
        let feeSat: number;
        let utxos: BTCUTXO[] = [];

        if (amountBTC.eq(-1)) {
            // Get all available UTXOs
            utxos = await this.getAvailableUtxo(-1);
            if (!utxos)
                return null;

            feeSat = WalletUtil.estimateBTCFee(utxos.length, 2, feeInSatPerKB);
        } else {
            // In order to estimate how much utxo is needed
            const amountSat = btcToSats(amountBTC).toNumber();

            utxos = await this.getAvailableUtxo(amountSat + feeInSatPerKB);
            if (!utxos)
                return null;

            feeSat = WalletUtil.estimateBTCFee(utxos.length, 2, feeInSatPerKB)
        }

        return {
            utxos, // UTXOs to spend
            feeSat // Transaction fee in sat
        };
    }

    /**
     * Estimates the right number of SAT per kB to use to send a transaction.
     * The rate is either forced by the user, or automatically estimated by the node API
     * based on the number of blocks we are ready to wait for the transaction to go through.
     */
    private async estimateFeeRate(feeRate = BTCFeeSpeed.AVERAGE, forcedSatPerKB = null): Promise<number> {
        if (forcedSatPerKB)
            return forcedSatPerKB;

        const btcPerKB = await GlobalBTCRPCService.instance.estimatesmartfee(this.rpcApiUrl, feeRate);
        if (!btcPerKB)
            throw new Error("BTCSubWallet: Failed to estimate fee rate by API");

        return Util.accMul(btcPerKB, Config.SATOSHI);
    }

    /**
     * Estimates the fee in satoshi that we need to pay to be able to send a transaction of "amount" BTCs
     *
     * @returns Fees, in satoshi
     */
    public async estimateTransferTransactionGas(feeSpeed = BTCFeeSpeed.AVERAGE, forcedSatPerKB = null, amountBTC: BigNumber = null) {
        let satPerKB = await this.estimateFeeRate(feeSpeed, forcedSatPerKB);
        Logger.log('wallet', 'BTCSubWallet: satPerKB:', satPerKB)

        // TODO: Normally the data less than 1KB.
        // Fees are related to input and output.
        if (!amountBTC)
            return satPerKB;

        let result = await this.getUTXOsAndFee(amountBTC, satPerKB)
        return result.feeSat;
    }

    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = "", feeSpeed = BTCFeeSpeed.AVERAGE, forcedSatPerKB = null): Promise<string> {
        let satPerKB = await this.estimateFeeRate(feeSpeed, forcedSatPerKB);

        let toAmount = 0;
        let { feeSat, utxos } = await this.getUTXOsAndFee(amount, satPerKB)
        if (amount.eq(-1)) {
            toAmount = Math.floor(this.balance.minus(feeSat).toNumber());
        } else {
            toAmount = btcToSats(amount).toNumber();
        }

        let outputs: BTCOutputData[] = [{
            "Address": toAddress,
            "Amount": toAmount
        }]

        for (let i = 0; i < utxos.length; i++) {
            if (!utxos[i].utxoHex) {
                let rawtransaction = await GlobalBTCRPCService.instance.getrawtransaction(this.explorerApiUrl, utxos[i].txid);
                if (rawtransaction) {
                    utxos[i].utxoHex = rawtransaction.hex;
                } else {
                    Logger.log('wallet', 'GlobalBTCRPCService getrawtransaction error');
                    return null;
                }
            }
        }

        Logger.log('wallet', 'BTCSubWallet: createBTCTransaction  toAddress:', toAddress, ' amount:', toAmount, ' feeSat:', feeSat)
        return (this.networkWallet.safe as any as BTCSafe).createBTCPaymentTransaction(
            utxos,
            outputs,
            this.btcAddress,
            satsToBtc(satPerKB).toString(),
            feeSat);
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
        let btcInfo = await GlobalBTCRPCService.instance.address(this.explorerApiUrl, this.btcAddress, TRANSACTION_LIMIT, 1);
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
