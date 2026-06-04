import { OfflineTransactionsService } from "../../services/offlinetransactions.service";
import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { TransactionListType } from "../networks/evms/evm.types";
import { TimeBasedPersistentCache } from "../timebasedpersistentcache";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { TransactionProvider } from "./transaction.provider";
import { AnyOfflineTransaction, GenericTransaction } from "./transaction.types";

export type AnySubWalletTransactionProvider = SubWalletTransactionProvider<any, any>;
const DOMAIN_BLOCK_DURATION_MS = 120 * 1000; // 2 minutes

/**
 * One provider can have multiple caches/paginated lists.
 * ELA mainchain for example will have only one. But ERC20 tokens use one provider, for multiple tokens.
 */
export abstract class SubWalletTransactionProvider<SubWalletType extends AnySubWallet, TransactionType extends GenericTransaction> {
  // Disk cache for fast/offline display of transactions when entering a screen.
  // Always contains only the N most recent transactions
  protected transactionsCache: Map<string, TimeBasedPersistentCache<TransactionType>>;
  // Number of transactions fetched from network (for pagination cursor). Resets on fetchNewest, accumulates on fetchMore.
  private fetchedCountByCacheKey: Map<string, number> = new Map();

  /** Timestamp until which fetch is blocked (rate limiting). null = not blocked. */
  private fetchBlockedUntilTimestamp: number | null = null;

  constructor(protected provider: TransactionProvider<any>, protected subWallet: SubWalletType) {
  }

  public initialize(): Promise<void> {
    this.transactionsCache = new Map();
    return;
  }

  /**
   * Method that must be called by the UI before accessing subwallet transactions.
   * Typically, this method loads the transaction cache for better UI reactivity right after.
   */
  public async prepareTransactions(cacheKey): Promise<void> {
    // Create the cache for preload transactions
    await this.getCache(cacheKey);
  }

  public async getTransactions(subWallet: AnySubWallet, transactionListType = TransactionListType.NORMAL): Promise<TransactionType[]> {
    let cacheKey = subWallet.getTransactionsCacheKey(transactionListType);
    await this.prepareTransactions(cacheKey);
    if (!this.transactionsCache.has(cacheKey))
      throw new Error("prepareTransactions() must be called before accessing getTransactions()");

    return this.transactionsCache.get(cacheKey).values().map(cacheEntry => cacheEntry.data);
  }

  public getOfflineTransactions(): Promise<AnyOfflineTransaction[]> {
    let offlineTxs = OfflineTransactionsService.instance.getTransactions(this.subWallet);
    return offlineTxs;
  }

  protected abstract getProviderTransactionInfo(transaction: TransactionType): ProviderTransactionInfo;

  private async getCache(cacheKey: string): Promise<TimeBasedPersistentCache<TransactionType>> {
    if (this.transactionsCache.has(cacheKey))
      return this.transactionsCache.get(cacheKey);

    let cache = await TimeBasedPersistentCache.loadOrCreate<TransactionType>(cacheKey);
    this.transactionsCache.set(cacheKey, cache);

    //console.log("DEBUG loaded cache",cacheKey,"contains", cache.size(),"entries");

    return cache;
  }

  /**
   * @param isNewestFetch When true (fetchNewestTransactions), resets fetched count. When false (fetchMore), adds to count.
   */
  public async saveTransactions(newTransactions: TransactionType[], isNewestFetch?: boolean): Promise<void> {
    //console.log("DEBUG saveTransactions newTransactions=", newTransactions);

    if (!newTransactions)
      return;

    let modifiedCaches: Map<string, TimeBasedPersistentCache<any>> = new Map();
    let modifiedTransactionListsSubjects: Map<string, string> = new Map();

    for (let i = 0; i < newTransactions.length; i++) {
      let providerTransactionInfo = this.getProviderTransactionInfo(newTransactions[i]);

      let cache = await this.getCache(providerTransactionInfo.cacheKey);
      // In order to reduce the size of the cache, do not save useless data.
      if ((newTransactions[i] as any).input) {
        (newTransactions[i] as any).input = "";
      }

      cache.set(providerTransactionInfo.cacheEntryKey, newTransactions[i], providerTransactionInfo.cacheTimeValue);

      modifiedCaches.set(providerTransactionInfo.cacheKey, cache); // Same key, same cache, but we want to save each cache only once
      modifiedTransactionListsSubjects.set(providerTransactionInfo.subjectKey, providerTransactionInfo.subjectKey); // unique list of subject keys to notify in the end
    }

    for (const cacheKey of modifiedCaches.keys()) {
      if (isNewestFetch === true) {
        this.fetchedCountByCacheKey.set(cacheKey, newTransactions.length);
      } else if (isNewestFetch === false) {
        const prev = this.fetchedCountByCacheKey.get(cacheKey) || 0;
        this.fetchedCountByCacheKey.set(cacheKey, prev + newTransactions.length);
      }
      // undefined: don't update (e.g. updateTransactions from other sources)
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

  public async removeTransactionsFromCache(transactions: TransactionType[]): Promise<void> {
    if (!transactions)
      return;

    let modifiedCaches: Map<string, TimeBasedPersistentCache<any>> = new Map();

    for (let i = 0; i < transactions.length; i++) {
      let providerTransactionInfo = this.getProviderTransactionInfo(transactions[i]);

      let cache = await this.getCache(providerTransactionInfo.cacheKey);
      cache.remove(providerTransactionInfo.cacheEntryKey);

      modifiedCaches.set(providerTransactionInfo.cacheKey, cache); // Same key, same cache, but we want to save each cache only once
    }

    for (let cache of modifiedCaches.values()) {
      await cache.save();
    }
  }

  /**
   * Tells whether there are more transactions to fetch after the ones that we already
   * have in the cache right now.
   */
  public abstract canFetchMoreTransactions(subWallet: AnySubWallet): boolean;

  /**
   * Returns the number of transactions fetched in the first/initial request.
   */
  public getInitialFetchSize(): number {
    return 30;
  }

  /**
   * Returns the number of transactions fetched from network so far (for pagination cursor).
   * Use the transaction at index (getFetchedCount - 1) as afterTransaction.
   */
  public getFetchedCount(cacheKey: string): number {
    return this.fetchedCountByCacheKey.get(cacheKey) || 0;
  }

  /**
   * Fetches transactions (real network call). If afterTransaction if not given, the most recent transactions
   * are fetched.
   */
  public abstract fetchTransactions(subWallet: AnySubWallet, afterTransaction?: GenericTransaction);


  protected blockFetch(): void {
    this.fetchBlockedUntilTimestamp = Date.now() + DOMAIN_BLOCK_DURATION_MS;
  }

  protected unblockFetch(): void {
    this.fetchBlockedUntilTimestamp = null;
  }

  protected isFetchTransactionsBlocked(): boolean {
    if (!this.fetchBlockedUntilTimestamp) {
      return false;
    }
    return Date.now() <= this.fetchBlockedUntilTimestamp;
  }
}