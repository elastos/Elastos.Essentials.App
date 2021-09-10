import { TimeBasedPersistentCache } from "../timebasedpersistentcache";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { TransactionProvider } from "./transaction.provider";
import { GenericTransaction } from "./transaction.types";

export type AnySubWalletTransactionProvider = SubWalletTransactionProvider<any, any>;

/**
 * One provider can have multiple caches/paginated lists.
 * ELA mainchain for example will have only one. But ERC20 tokens use one provider, for multiple tokens.
 */
export abstract class SubWalletTransactionProvider<SubWalletType extends SubWallet<any>, TransactionType extends GenericTransaction> {
  // Disk cache for fast/offline display of transactions when entering a screen.
  // Always contains only the N most recent transactions
  protected transactionsCache: Map<string, TimeBasedPersistentCache<TransactionType>>;

  constructor(protected provider: TransactionProvider<any>, protected subWallet: SubWalletType) {
  }

  public initialize(): Promise<void> {
    this.transactionsCache = new Map();
    //this.transactions = new Map();
    return;
  }

  public async prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    // Create the cache for preload transactions
    await this.getCache(subWallet.getTransactionsCacheKey());
  }

  public async getTransactions(subWallet: AnySubWallet): Promise<TransactionType[]> {
    await this.prepareTransactions(subWallet);

    let cacheKey = subWallet.getTransactionsCacheKey();
    if (!this.transactionsCache.has(cacheKey))
      throw new Error("prepareTransactions() must be called before accessing getTransactions()");

    return this.transactionsCache.get(cacheKey).values().map(cacheEntry => cacheEntry.data);
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

  protected async saveTransactions(newTransactions: TransactionType[]): Promise<void> {
    //console.log("DEBUG saveTransactions newTransactions=", newTransactions);

    if (!newTransactions)
      return;

    let modifiedCaches: Map<string, TimeBasedPersistentCache<any>> = new Map();
    let modifiedTransactionListsSubjects: Map<string, string> = new Map();

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

  /**
   * Tells whether there are more transactions to fetch after the ones that we already
   * have in the cache right now.
   */
  public abstract canFetchMoreTransactions(subWallet: AnySubWallet): boolean;

  /**
   * Fetches transactions (real network call). If afterTransaction if not given, the most recent transactions
   * are fetched.
   */
  public abstract fetchTransactions(subWallet: AnySubWallet, afterTransaction?: GenericTransaction);
}