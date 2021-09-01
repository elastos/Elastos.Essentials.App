import { Console } from "console";
import { BehaviorSubject, Subject } from "rxjs";
import { StandardCoinName, TokenAddress, TokenType } from "./Coin";
import { TimeBasedPersistentCache } from "./timebasedpersistentcache";
import { GenericTransaction, PaginatedTransactions } from "./transaction.types";
import { NetworkWallet } from "./wallets/networkwallet";
import { AnySubWallet, SubWallet } from "./wallets/subwallet";

export type NewTransaction = {
  // TODO
}

export type NewToken = {
  type: TokenType;
  // TODO
}

export type ProviderTransactionInfo = {
  cacheKey: string;       // Key for the cache to which this transaction belongs. Same for all transactions of the same subwallet
  cacheEntryKey: string;  // Item key identifier for this item, inside its target cache
  cacheTimeValue: number; // Timestamp used to clean old cache items
  subjectKey: string;     // Key used by RxSubjects to listen to events about this kind of transaction
}

/**
 * Class that allows networks to fetch and refresh transactions in background, or when the UI needs more.
 * Normally, one TransactionProvider per network should be implemented.
 *
 * Many times, the UI is passive and should NOT fetch transactions by itself. It should only get transactions
 * that are provided by the transactions provider.
 */
export abstract class TransactionProvider<TransactionType extends GenericTransaction> {
  protected _transactionsListChanged: Map<StandardCoinName | TokenAddress, BehaviorSubject<void>>; // When loading from cache initially, or fetching new transactions from RPC
  // TODO: make protected like _transactionsListChanged
  public newTransactionReceived: Map<StandardCoinName | TokenAddress, Subject<NewTransaction>>; // Transactions seen for the first time - not emitted the very first time (after wallet import - initial fetch)
  protected newTokenReceived: Subject<NewToken>; // erc 20 + erc 721 tokens that are seen for the first time.

  constructor() {
    this._transactionsListChanged = new Map();
    this.newTransactionReceived = new Map();
    this.newTokenReceived = new Subject();
  }

  /**
   * Starts the provider so it can periodically search for new transactions and tokens.
   */
  public abstract start();

  /**
   * Stops the provider. For instance, when the network is changed.
   * At this time, transactions should stop to be refreshed.
   */
  public abstract stop(): Promise<void>;

  /**
   * Method that must be called by the UI before accessing subwallet transactions.
   * Typically, this method loads the transaction cache for better UI reactivity right after.
   *
   * Must be called before any access to getTransactions().
   */
  public abstract prepareTransactions(subWallet: AnySubWallet): Promise<void>;

  /**
   * Gets the transactions as available currency in the local model, without any fetch.
   */
  public abstract getTransactions(subWallet: SubWallet<TransactionType>, startIndex?: number): TransactionType[];

  /**
   * Tells if there are more transactions that can be fetched, for example when some APIs return paginated
   * results. If this information is unknown, the implementation should return false.
   */
  public abstract canFetchMoreTransactions(subWallet: SubWallet<TransactionType>): boolean;

  /**
   * Used by the UI to either (for instance):
   * - fetch older transactions when scrolling down
   * - refresh the new transactions manually (even if the most recent transactions are normally
   * automatically fetched by the transaction provider).
   *
   * If afterTransaction is not provided, the most recent transactions are fetched.
   */
  public abstract forcedFetchTransactions(subWallet: SubWallet<TransactionType>, afterTransaction?: TransactionType);

  /**
   * Subject that informs listeners whenever the transactions list gets updated.
   */
  public transactionsListChanged(coinID: StandardCoinName | TokenAddress): BehaviorSubject<void> {
    if (!this._transactionsListChanged.has(coinID))
      this._transactionsListChanged.set(coinID, new BehaviorSubject(null));
    return this._transactionsListChanged.get(coinID);
  }
}

export type AnySubWalletTransactionProvider = SubWalletTransactionProvider<any, any>;

export abstract class SubWalletTransactionProvider<SubWalletType extends SubWallet<any>, TransactionType extends GenericTransaction> {
  // One provider can have multiple caches/paginated lists.
  // ELA mainchain for example will have only one. But ERC20 tokens use one provider, for multiple tokens.
  //private paginatedTransactions: Map<string, PaginatedTransactions<TransactionType>> = null;
  protected transactionsCache: Map<string, TimeBasedPersistentCache<TransactionType>>;

  constructor(protected provider: TransactionProvider<any>, protected subWallet: SubWalletType) {
  }

  public initialize(): Promise<void> {
    this.transactionsCache = new Map();
    //this.paginatedTransactions = new Map();
    return;
  }

  public async prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    // Create the cache for preload transactions
    await this.getCache(subWallet.getTransactionsCacheKey());
  }

  public getTransactions(subWallet: AnySubWallet, startIndex = 0): TransactionType[] {
    let cacheKey = subWallet.getTransactionsCacheKey();
    if (!this.transactionsCache.has(cacheKey))
      throw new Error("prepareTransactions() must be called before accessing getTransactions()");

    return this.transactionsCache.get(cacheKey).values().map(cacheEntry => cacheEntry.data);
    //return this.getPaginatedTransactions(cacheKey);
  }

  protected abstract getProviderTransactionInfo(transaction: TransactionType): ProviderTransactionInfo;

  /* protected getPaginatedTransactions(cacheKey: string): PaginatedTransactions<TransactionType> {
    if (!this.paginatedTransactions.has(cacheKey)) {
      // Initialize the object in the map if not yet existing
      this.paginatedTransactions.set(cacheKey, { total: 0, transactions: [] });
    }

    return this.paginatedTransactions.get(cacheKey);
  } */

  private async getCache(cacheKey: string): Promise<TimeBasedPersistentCache<TransactionType>> {
    if (this.transactionsCache.has(cacheKey))
      return this.transactionsCache.get(cacheKey);

    let cache = await TimeBasedPersistentCache.loadOrCreate<TransactionType>(cacheKey);
    //this.loadTransactionsFromCache(cache);
    this.transactionsCache.set(cacheKey, cache);
    return cache;
  }

  /* private loadTransactionsFromCache(cache: TimeBasedPersistentCache<any>) {
    if (cache.size() !== 0) {
      //let paginatedTransactions = this.getPaginatedTransactions(cache.name);

      console.log("DEBUG loadTransactionsFromCache", cache.values());

      let items = cache.values();
      for (let i = 0, len = paginatedTransactions.total; i < len; i++) {
        paginatedTransactions.transactions.push(items[i].data);
      }
      paginatedTransactions.total = cache.size();
    }
  } */

  /* protected mergeTransactions(cacheKey: string, newTransactions: TransactionType[]) {
    //let currentPaginatedTransactions = this.getPaginatedTransactions(cacheKey);
    //currentPaginatedTransactions.total = newTransactions.total; // Assume the newly fetched data returns the most up-to-date total
    newTransactions.transactions.forEach(t => {
      this.getProviderTransactionInfo(t).
    });
  } */

  /**
   * Saves the new transactions to the relevant current paginated transactions and cache.
   *
   * NOTE: The same transactions list can contain transactions for different subjects. Ex: when ERC20
   * token transactions are mixed.
   */
  protected async saveTransactions(newTransactions: TransactionType[]): Promise<void> {
    //console.log("DEBUG saveTransactions newTransactions=", newTransactions);

    let modifiedCaches: Map<string, TimeBasedPersistentCache<any>> = new Map();
    let modifiedTransactionListsSubjects: Map<string, string> = new Map();

    //let currentPaginatedTransactions = this.getPaginatedTransactions(cacheKey);
    //currentPaginatedTransactions.total = newTransactions.total; // Assume the newly fetched data returns the most up-to-date total

    for (let i = 0; i < newTransactions.length; i++) {
      let providerTransactionInfo = this.getProviderTransactionInfo(newTransactions[i]);

      let cache = await this.getCache(providerTransactionInfo.cacheKey);
      cache.set(providerTransactionInfo.cacheEntryKey, newTransactions[i], providerTransactionInfo.cacheTimeValue);

      modifiedCaches.set(providerTransactionInfo.cacheKey, cache); // Same key, same cache, but we want to save each cache only once
      modifiedTransactionListsSubjects.set(providerTransactionInfo.subjectKey, providerTransactionInfo.subjectKey); // unique list of subject keys to notify in the end
    }

    for (let cache of modifiedCaches.values()) {
      //console.log("DEBUG saveTransactions saving cache:", cache);
      await cache.save();
    }

    // Notifies respective listeners that some new transactions that they are interested in have arrived.
    for (let subjectKey of modifiedTransactionListsSubjects.values()) {
      //console.log("DEBUG saveTransactions notifying transactions list subject:", subjectKey);
      this.provider.transactionsListChanged(subjectKey).next();
    }
  }

  // Should be overriden by providers that can really fetch more
  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false;
  }

  // Should be overriden by providers that can really fetch more
  public forcedFetchTransactions(subWallet: AnySubWallet, afterTransaction?: GenericTransaction) {
    if (!this.canFetchMoreTransactions(subWallet))
      throw new Error("forcedFetchTransactions() cannot be called because no more transactions can be fetched");
  }
}