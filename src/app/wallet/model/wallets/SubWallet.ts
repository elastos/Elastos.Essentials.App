import { MasterWallet } from './masterwallet';
import { NetworkWallet } from './networkwallet';
import { CoinType, CoinID, StandardCoinName } from '../coin';
import { ElastosPaginatedTransactions, RawTransactionPublishResult, PaginatedTransactions, ElastosTransaction, TransactionInfo, TransactionStatus, GenericTransaction } from '../providers/transaction.types';
import { Transfer } from '../../services/cointransfer.service';
import BigNumber from 'bignumber.js';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TimeBasedPersistentCache } from '../timebasedpersistentcache';
import { Subject } from 'rxjs';

/**
 * Subwallet representation ready to save to local storage for persistance.
 * Only non standard subwallets are serialized
 */
export class SerializedSubWallet {
    public type: CoinType = null;
    public id: StandardCoinName = null;

    /**
     * Serialize only fields that we are willing to have in the serialized output.
     * and the balance type of subwallet is bigNumber,
     * It needs to be converted to string and then saved to localstorage.
     */
    public static fromSubWallet(subWallet: SubWallet<any>): SerializedSubWallet {
        const serializedSubWallet = new SerializedSubWallet();
        serializedSubWallet.type = subWallet.type;
        serializedSubWallet.id = subWallet.id as StandardCoinName;
        return serializedSubWallet;
    }
}

// Convenient type to avoid adding SubWallet<any> everywhere.
export type AnySubWallet = SubWallet<any>;

export abstract class SubWallet<TransactionType extends GenericTransaction> {
    public masterWallet: MasterWallet;
    public id: CoinID = null;
    public balance: BigNumber = new BigNumber(NaN); // raw balance. Will be sELA for standard wallets, or a token number for ERC20 coins.
    public lastBlockTime: string = null;

    public balanceCache: TimeBasedPersistentCache<any> = null;
    public balanceKeyInCache = '';

    public loadTxDataFromCache = true;
    public subwalletTransactionStatusID = '';

    constructor(public networkWallet: NetworkWallet, id: CoinID, public type: CoinType) {
      this.masterWallet = networkWallet.masterWallet;
      this.id = id;
      this.type = type;

      this.balanceKeyInCache = this.masterWallet.id + '-' + this.id + '-balance';
      this.subwalletTransactionStatusID = this.masterWallet.id + '-' + this.id;
    }

    /**
     * Starts updates in background.
     * All the initializations here are not mandatory during initializations and can deliver
     * asynchronous content at any time.
     *
     * This method can be overriden by subwallet implementations.
     */
    public startBackgroundUpdates(): Promise<void> {
      void this.loadBalanceFromCache();
      return;
    }

    public toSerializedSubWallet(): SerializedSubWallet {
        return SerializedSubWallet.fromSubWallet(this);
    }

    private async loadBalanceFromCache() {
      this.balanceCache = await TimeBasedPersistentCache.loadOrCreate(this.balanceKeyInCache);
      if (this.balanceCache.size() !== 0) {
          this.balance = new BigNumber(this.balanceCache.values()[0].data);
      }
    }

    public async saveBalanceToCache(): Promise<void> {
      const timestamp = (new Date()).valueOf();
      this.balanceCache.set('balance', this.balance, timestamp);
      await this.balanceCache.save();
    }

    /**
     * If we get the transactions from cache, then we need update the transactions in 3s.
     */
    public isLoadTxDataFromCache() {
        return this.loadTxDataFromCache;
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
    protected abstract getTransactionName(transaction: ElastosTransaction, translate: TranslateService): Promise<string>;

    /**
     * From a given transaction return a UI displayable transaction icon that illustrates the transaction operation.
     */
    protected abstract getTransactionIconPath(transaction: ElastosTransaction): Promise<string>;

    /**
     * Inheritable method to do some cleanup when a subwallet is removed/destroyed from a master wallet
     */
    public async destroy(): Promise<void> {
        if (this.balanceCache)
          await this.balanceCache.delete();
        return Promise.resolve();
    }

    /**
     * Create a new wallet address for receiving payments.
     */
    public abstract createAddress(): Promise<string>;

    /**
     * Returns the path to the main icon representing the subwallet.
     * For standard subwallets, this is usually the network icon. For ERC20 subwallets,
     * this is usually a "ETH" icon (default) or the coin icon (if known), as the secondary icon shows the network
     */
    public abstract getMainIcon(): string;

    /**
     * Returns the path to a secondary icon. Standard subwallets usually don't have one and should return null.
     * ERC20 subwallets usually show the network icon, as the primary icon already shows the coin itself.
     */
    public abstract getSecondaryIcon(): string;

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
     * Requests a wallet to update its balance and transactions.
     */
    public abstract update();

    /**
     * Requests a wallet to update its balance. Usually called when we receive an event from the SPV SDK,
     * saying that a new balance amount is available.
     */
    public abstract updateBalance();

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
     * Method that must be called by the UI before accessing subwallet transactions.
     * Typically, this method loads the transaction cache for better UI reactivity right after.
     */
    public prepareTransactions(): Promise<void> {
      return this.networkWallet.getTransactionDiscoveryProvider().prepareTransactions(this);
    }

    /**
     * Get a partial list of transactions, from the given index.
     * TODO: The "AllTransactions" type is very specific to SPVSDK. We will maybe have to change this type to a common type
     * with ERC20 "transaction" type when we have more info about it.
     */
    public getTransactions(startIndex = 0): TransactionType[] {
      return this.networkWallet.getTransactionDiscoveryProvider().getTransactions(this, startIndex);
    }

    /**
     * Request a network call to fetch the latest transactions for this subwallet.
     */
    public forceFetchTransactions() {
      this.networkWallet.getTransactionDiscoveryProvider().forcedFetchTransactions(this);
    }

    public getTransactionsCacheKey(): string {
      return this.masterWallet.id + "-" + this.networkWallet.network.key + "-" + this.id + "-transactions";
    }

    public abstract getTransactionInfo(transaction: TransactionType, translate: TranslateService): Promise<TransactionInfo>;

    /**
     * Fetches the transactions using the right RPC APIs and converts data into a common transactions
     * list format shared by all EVM subwallets.
     */
    //public abstract fetchTransactions(startingAt?: number): Promise<GenericTransaction[]>;

    //public abstract canFetchMoreTransactions(): boolean;

    /**
     * Save the transctions list to cache.
     */
    //public abstract saveTransactions(transactions: GenericTransaction[]);

    /**
     * Method called by the wallet home screen to known if the subwallet should appear in the list or not.
     * In most cases, this method returns true because we want to show the subwallet. But some cases such
     * as the old elastos ID chain wallet are hidden by overriding this method.
     */
    public shouldShowOnHomeScreen(): boolean {
      return true;
    }

    protected getMemoString(memo: string) {
      if (memo.startsWith('type:text,msg:')) {
        return memo.substring(14);
      } else {
        return memo;
      }
    }

    public transactionsListChanged(): Subject<void> {
      return this.networkWallet.getTransactionDiscoveryProvider().transactionsListChanged(this.id);
    }

    // public abstract getTransactionDetails(txid: string): Promise<TransactionDetail>;

    public abstract createPaymentTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string): Promise<string>;
    public abstract createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string): Promise<string>;
    public abstract publishTransaction(transaction: string): Promise<string>;
    public abstract signAndSendRawTransaction(transaction: string, transfer: Transfer): Promise<RawTransactionPublishResult>;
}
