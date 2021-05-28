import { MasterWallet } from './MasterWallet';
import { CoinType, CoinID, StandardCoinName } from '../Coin';
import { AllTransactionsHistory, TransactionDetail, TransactionHistory, TransactionInfo, TransactionStatus } from '../Transaction';
import { Transfer } from '../../services/cointransfer.service';
import BigNumber from 'bignumber.js';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Events } from 'src/app/services/events.service';
import { JsonRPCService } from '../../services/jsonrpc.service';

/**
 * Result of calls to signAndSendRawTransaction().
 */
export type RawTransactionPublishResult = {
    published: boolean; // Whether the transaction was successfully published to the node/spvsdk or not
    txid?: string; // In case of successful publication, ID of the published transaction.
    status?: string; // published, cancelled, error
}

/**
 * Subwallet representation ready to save to local storage for persistance.
 */
export class SerializedSubWallet {
    public type: CoinType = null;
    public id: StandardCoinName = null;
    public balance: string = null;
    public lastBlockTime: string = null;
    public timestamp: number = -1;
    public progress: number = 0;
    public timestampRPC: number = 0;

    /**
     * Serialize only fields that we are willing to have in the serialized output.
     * and the balance type of subwallet is bigNumber,
     * It needs to be converted to string and then saved to localstorage.
     */
    public static fromSubWallet(subWallet: SubWallet): SerializedSubWallet {
        const serializedSubWallet = new SerializedSubWallet();
        serializedSubWallet.type = subWallet.type;
        serializedSubWallet.id = subWallet.id as StandardCoinName;
        serializedSubWallet.balance = subWallet.balance.toString();
        serializedSubWallet.lastBlockTime = subWallet.lastBlockTime;
        serializedSubWallet.timestamp = subWallet.timestamp;
        serializedSubWallet.progress = subWallet.progress;
        serializedSubWallet.timestampRPC = subWallet.timestampRPC ? subWallet.timestampRPC : 0;
        return serializedSubWallet;
    }
}

export abstract class SubWallet {
    public id: CoinID = null;
    public balance: BigNumber = new BigNumber(0); // raw balance. Will be sELA for standard wallets, or a token number for ERC20 coins.
    public lastBlockTime: string = null;
    public syncTimestamp: number = -1; // Time (ms) at which the wallet was last synced
    public timestamp: number = -1; // Time (ms) at which the progress was last updated (CAUTION: this is NOT the block sync time)
    public progress: number = 0;
    public balanceByRPC: BigNumber = new BigNumber(0);
    public timestampRPC: number = 0; // Time at which the "get balance" RPC API was last called

    private events: Events;
    public jsonRPCService: JsonRPCService = null;

    constructor(protected masterWallet: MasterWallet, id: CoinID, public type: CoinType) {
        this.id = id;
        this.type = type;
        this.events = this.masterWallet.walletManager.events;
        this.jsonRPCService = this.masterWallet.walletManager.jsonRPCService;
    }

    public toSerializedSubWallet(): SerializedSubWallet {
        return SerializedSubWallet.fromSubWallet(this);
    }

    public initFromSerializedSubWallet(serializedSubWallet: SerializedSubWallet) {
        // type and id are initialized in constructor
        // this.type = serializedSubWallet.type;
        // this.id = serializedSubWallet.id;
        this.balance = new BigNumber(serializedSubWallet.balance);
        this.lastBlockTime = serializedSubWallet.lastBlockTime;
        this.timestamp = serializedSubWallet.timestamp;
        this.timestampRPC = serializedSubWallet.timestampRPC;
        // This progress does not start with Block 0, but start with last synchronized blocks
        // So do not get progress from local storage
        // this.progress = serializedSubWallet.progress;
    }

    /**
     * From a raw status, returns a UI readable string status.
     */
    public getTransactionStatusName(status: TransactionStatus, translate: TranslateService): string {
        let statusName = null;
        switch (status) {
            case TransactionStatus.CONFIRMED:
                statusName = translate.instant("wallet.coin-transaction-status-confirmed");
                break;
            case TransactionStatus.PENDING:
                statusName = translate.instant("wallet.coin-transaction-status-pending");
                break;
            case TransactionStatus.UNCONFIRMED:
                statusName = translate.instant("wallet.coin-transaction-status-unconfirmed");
                break;
        }
        return statusName;
    }

    /**
     * From a given transaction return a UI displayable transaction title.
     */
    protected abstract getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string>;

    /**
     * From a given transaction return a UI displayable transaction icon that illustrates the transaction operation.
     */
    protected abstract getTransactionIconPath(transaction: TransactionHistory): Promise<string>;

    /**
     * Inheritable method to do some cleanup when a subwallet is removed/destroyed from a master wallet
     */
    public destroy(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Create a new wallet address for receiving payments.
     */
    public abstract createAddress(): Promise<string>;

    /**
     * Returns a UI readable name for this sub wallet.
     * Ex: for a ERC20 token, this will be the token description such as "Trinity Tech"
     */
    public abstract getFriendlyName(): string;

    /**
     * Returns a UI displayable token symbol.
     * Ex: for a ERC20 token, this will be something like "TTECH"
     */
    public abstract getDisplayTokenName(): string;

    /**
     * Converts a given value in this wallet in the external currency chosen by user (USD, BTC, CNY, etc).
     * In case the subwallet is not able to compute this value (ex: ERC20 coins for now), the returned
     * value is null.
     */
    public abstract getAmountInExternalCurrency(value: BigNumber): BigNumber;

    /**
     * Requests a wallet to update its balance. Usually called when we receive an event from the SPV SDK,
     * saying that a new balance amount is available.
     */
    public abstract updateBalance();

    /**
     * Updates current SPV synchonization progress information.
     */
    public abstract updateSyncProgress(progress: number, lastBlockTime: number);

    /**
     * Shortcut for getDisplayAmount(balance)
     */
    public abstract getDisplayBalance(): BigNumber;

    /**
     * Returns a given value converted to a human friendly unit. For example, standard wallets have a balance in sELA but
     * getDisplayBalance() returns the amount in ELA.
     */
    public abstract getDisplayAmount(amount: BigNumber): BigNumber;

    /**
     * Tells if this subwallet has a balance greater than or equal to the given amount.
     * For SPV subwallets, this method should be called only after wallet is synced.
     */
    public abstract isBalanceEnough(amount: BigNumber): boolean;

    /**
     * Get a partial list of transactions, from the given index.
     * TODO: The "AllTransactions" type is very specific to SPVSDK. We will maybe have to change this type to a common type
     * with ERC20 "transaction" type when we have more info about it.
     */
    public abstract getTransactions(startIndex: number): Promise<AllTransactionsHistory>;

    /**
     * Based on a raw transaction object (from the SPV SDK or API), returns a higher level
     * transaction info object ready to use on UI.
     *
     * Can be overriden to customize some fields.
     */
    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        const timestamp = transaction.time * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(-1), // Defined by inherited classes
            confirmStatus: -1, // Defined by inherited classes
            datetime,
            direction: transaction.type,
            fee: transaction.fee,
            height: transaction.height,
            memo: transaction.memo,
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '', // Defined by inherited classes
            timestamp,
            txid: null, // Defined by inherited classes
            type: null, // Defined by inherited classes
        };
        return transactionInfo;
    }

    public abstract getTransactionDetails(txid: string): Promise<TransactionDetail>;

    public abstract createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<string>;
    public abstract createWithdrawTransaction(toAddress: string, amount: number, memo: string): Promise<string>;
    public abstract publishTransaction(transaction: string): Promise<string>;
    public abstract signAndSendRawTransaction(transaction: string, transfer: Transfer): Promise<RawTransactionPublishResult>;
}
