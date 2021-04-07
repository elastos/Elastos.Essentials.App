import { StandardSubWallet } from './StandardSubWallet';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { Transaction, TransactionDirection, TransactionInfo, TransactionType } from '../Transaction';
import { Config } from '../../config/Config';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { JsonRPCService } from '../../services/jsonrpc.service';
import { Logger } from 'src/app/logger';

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class MainAndIDChainSubWallet extends StandardSubWallet {
    constructor(masterWallet: MasterWallet, id: StandardCoinName) {
        super(masterWallet, id);
    }

    public async getTransactionInfo(transaction: Transaction, translate: TranslateService): Promise<TransactionInfo> {
        const transactionInfo = await super.getTransactionInfo(transaction, translate);

        transactionInfo.amount = new BigNumber(transaction.Amount, 10).dividedBy(Config.SELAAsBigNumber);
        transactionInfo.txId = transaction.TxHash;
        transactionInfo.confirmStatus = transaction.ConfirmStatus;

        if (transaction.Direction === TransactionDirection.RECEIVED) {
            transactionInfo.type = TransactionType.RECEIVED;
            transactionInfo.symbol = '+';
        } else if (transaction.Direction === TransactionDirection.SENT) {
            transactionInfo.type = TransactionType.SENT;
            transactionInfo.symbol = '-';
        } else if (transaction.Direction === TransactionDirection.MOVED) {
            transactionInfo.type = TransactionType.TRANSFER;
            transactionInfo.symbol = '';
        }

        return transactionInfo;
    }

    public async updateBalance() {
        Logger.log("wallet", 'MainAndIDChainSubWallet updateBalance ', this.id,
                    ' syncTimestamp:', this.syncTimestamp,
                    ' timestampRPC:', this.timestampRPC,
                    ' this.progress:', this.progress);

        // if the balance form spvsdk is newer, then use it.
        if ((this.progress === 100) || (this.syncTimestamp > this.timestampRPC)) {
            // Get the current balance from the wallet plugin.
            const balanceStr = await this.masterWallet.walletManager.spvBridge.getBalance(this.masterWallet.id, this.id);
            // Balance in SELA
            this.balance = new BigNumber(balanceStr, 10);
        } else {
            Logger.log("wallet", 'Do not get Balance from spvsdk.');
            // TODO: update balance by rpc?
        }
    }

    /**
     * Check whether there are any unconfirmed transactions
     * For dpos vote transaction
     */
    public async hasPendingBalance() {
        const jsonInfo = await this.masterWallet.walletManager.spvBridge.getBalanceInfo(this.masterWallet.id, this.id);
        const balanceInfoArray = JSON.parse(jsonInfo);
        for (const balanceInfo of balanceInfoArray) {
            if ((balanceInfo.Summary.SpendingBalance !== '0') ||
                (balanceInfo.Summary.PendingBalance !== '0')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check whether the available balance is enough.
     * @param amount unit is SELA
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        const jsonInfo = await this.masterWallet.walletManager.spvBridge.getBalanceInfo(this.masterWallet.id, this.id);
        const balanceInfoArray = JSON.parse(jsonInfo);
        let availableBalance = new BigNumber(0);
        let hadPengdingTX = false;
        // Send Max balance if amount < 0.
        let sengMax = amount.isNegative() ? true : false;

        for (const balanceInfo of balanceInfoArray) {
            if (balanceInfo.Summary.Balance !== '0') {
                let balanceOfasset = new BigNumber(balanceInfo.Summary.Balance);
                if (balanceInfo.Summary.SpendingBalance !== '0') {
                    hadPengdingTX = true;
                    balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.SpendingBalance));
                }
                if (balanceInfo.Summary.PendingBalance !== '0') {
                    hadPengdingTX = true;
                    balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.PendingBalance));
                }
                if (balanceInfo.Summary.LockedBalance !== '0') {
                    hadPengdingTX = true;
                    balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.LockedBalance));
                }
                // DepositBalance

                if (hadPengdingTX && sengMax) {
                    return false;
                }
                availableBalance = availableBalance.plus(balanceOfasset);
                if (availableBalance.gt(amount)) {
                    return true;
                }
            }
        }
        return false;
    }

    public async createPaymentTransaction(toAddress: string, amount: string, memo: string = ""): Promise<string> {
        return this.masterWallet.walletManager.spvBridge.createTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            '', // From address, not necessary
            toAddress,
            amount,
            memo // User input memo
        );
    }

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
        return this.masterWallet.walletManager.spvBridge.createWithdrawTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            '',
            toAmount.toString(),
            toAddress,
            memo
        );
    }

    /**
     * Get balance by RPC if the last block time of spvsdk is one day ago.
     */
    async getBalanceByRPC(jsonRPCService: JsonRPCService) {
        Logger.log("wallet", 'TIMETEST getBalanceByRPC start:', this.id);
        const currentTimestamp = moment().valueOf();
        const onedayago = moment().add(-1, 'days').valueOf();
        const oneHourago = moment().add(-10, 'minutes').valueOf();

        if (this.lastBlockTime
                && ((this.syncTimestamp > onedayago)
                || (this.timestampRPC > oneHourago))) {
            Logger.log("wallet", 'Do not need to get balance by rpc.',
                ' this.lastBlockTime:', this.lastBlockTime,
                ' this.syncTimestamp:', this.syncTimestamp,
                ' this.timestampRPC:', this.timestampRPC);
            return false;
        }

        let totalBalance = new BigNumber(0);

        let balance: BigNumber;
        // The Single Address Wallet should use the external address.
        if (!this.masterWallet.account.SingleAddress) {
            balance = await this.getBalanceByAddress(jsonRPCService, true);
            totalBalance = totalBalance.plus(balance);
        }

        balance = await this.getBalanceByAddress(jsonRPCService, false);
        totalBalance = totalBalance.plus(balance);

        this.balanceByRPC = totalBalance;
        this.balance = totalBalance;
        this.timestampRPC = currentTimestamp;

        Logger.log("wallet", 'TIMETEST getBalanceByRPC ', this.id, ' end');
        Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
        Logger.log("wallet", this.masterWallet.id, ' ', this.id, ' timestampRPC:', this.timestampRPC);
        return true;
    }

    async getBalanceByAddress(jsonRPCService: JsonRPCService, internalAddress: boolean) {
        // If the balance of 5 consecutive request is 0, then stop the query.(100 addresses)
        const maxRequestTimesOfGetEmptyBalance = 5;
        let requestTimesOfGetEmptyBalance = 0;
        // In order to calculate blanks
        let requestAddressCount = 1;

        let startIndex = 0;
        let totalBalance = new BigNumber(0);

        if (internalAddress) {
            Logger.log("wallet", 'get Balance for internal Address');
        } else {
            Logger.log("wallet", 'get Balance for external Address');
        }

        let addressArray = null;
        do {
            addressArray = await this.masterWallet.walletManager.spvBridge.getAllAddresses(
                    this.masterWallet.id, this.id, startIndex, internalAddress);
            if (addressArray.Addresses.length === 0) {
                requestAddressCount = startIndex;
                break;
            }
            startIndex += addressArray.Addresses.length;

            try {
                const balance = await jsonRPCService.getBalanceByAddress(this.id as StandardCoinName, addressArray.Addresses);
                totalBalance = totalBalance.plus(balance);

                if (balance.lte(0)) {
                    requestTimesOfGetEmptyBalance++;
                    if (requestTimesOfGetEmptyBalance >= maxRequestTimesOfGetEmptyBalance) {
                        requestAddressCount = startIndex;
                        break;
                    }
                } else {
                    requestTimesOfGetEmptyBalance = 0;
                }
            } catch (e) {
                Logger.log("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
                throw e;
            }
        } while (!this.masterWallet.account.SingleAddress);

        Logger.log("wallet", 'request Address count:', requestAddressCount);
        Logger.log("wallet", 'balance:', totalBalance.toString());

        return totalBalance;
    }
}
