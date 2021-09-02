import { Console } from "console";
import { BehaviorSubject, Subject } from "rxjs";
import { StandardCoinName, TokenAddress, TokenType } from "../Coin";
import { TimeBasedPersistentCache } from "../timebasedpersistentcache";
import { GenericTransaction, PaginatedTransactions } from "./transaction.types";
import { NetworkWallet } from "../wallets/networkwallet";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { TransactionProvider } from "./transaction.provider";
import { ProviderTransactionInfo } from "./providertransactioninfo";

export type AnySubWalletTransactionProvider = SubWalletTransactionProvider<any, any>;

/**
 * One provider can have multiple caches/paginated lists.
 * ELA mainchain for example will have only one. But ERC20 tokens use one provider, for multiple tokens.
 */
export abstract class SubWalletTransactionProvider<SubWalletType extends SubWallet<any>, TransactionType extends GenericTransaction> {
  // Disk cache for fast/offline display of transactions when entering a screen.
  // Always contains only the N most recent transactions
  protected transactionsCache: Map<string, TimeBasedPersistentCache<TransactionType>>;
  // Memory list of transactions that mixes transactions from the cache and also fetched transactions
  // (ex: during user screen scrolling)
  //protected transactions: Map<string, TransactionType[]> = null;
  private transactionsPrepared = false;

  constructor(protected provider: TransactionProvider<any>, protected subWallet: SubWalletType) {
  }

  public initialize(): Promise<void> {
    this.transactionsCache = new Map();
    //this.transactions = new Map();
    return;
  }

  public async prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    if (!this.transactionsPrepared) {
      // Create the cache for preload transactions
      await this.getCache(subWallet.getTransactionsCacheKey());
      this.transactionsPrepared = true;
    }
  }

  public getTransactions(subWallet: AnySubWallet): TransactionType[] {
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
    //this.loadTransactionsFromCache(cache);
    this.transactionsCache.set(cacheKey, cache);

    console.log("DEBUG loaded cache",cacheKey,"contains", cache.size(),"entries");

    return cache;
  }

  /* private loadTransactionsFromCache(cache: TimeBasedPersistentCache<any>) {
    if (cache.size() !== 0) {
      let transactions = this.getTransactionsSafe(cache.name);

      console.log("DEBUG loadTransactionsFromCache", cache.values());

      let cachedTransactions = cache.values();
      for (let i = 0; i < cachedTransactions.length; i++) {
        transactions.push(cachedTransactions[i].data);
      }
    }
  } */

  /* protected mergeTransactions(cacheKey: string, newTransactions: TransactionType[]) {
    //let currentPaginatedTransactions = this.getPaginatedTransactions(cacheKey);
    //currentPaginatedTransactions.total = newTransactions.total; // Assume the newly fetched data returns the most up-to-date total
    newTransactions.transactions.forEach(t => {
      this.getProviderTransactionInfo(t).
    });
  } */

  protected async saveTransactions(newTransactions: TransactionType[]): Promise<void> {
    //console.log("DEBUG saveTransactions newTransactions=", newTransactions);

    if (!newTransactions)
      return;

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

  /**
   * Saves the new transactions to the relevant current paginated transactions and cache.
   *
   * NOTE: The same transactions list can contain transactions for different subjects. Ex: when ERC20
   * token transactions are mixed.
   */
  /* protected async saveTransactions(newTransactions: TransactionType[]): Promise<void> {
    //console.log("DEBUG saveTransactions newTransactions=", newTransactions);

    if (!newTransactions)
      return;

    let modifiedCaches: Map<string, TimeBasedPersistentCache<any>> = new Map();
    let modifiedTransactionListsSubjects: Map<string, string> = new Map();

    // Split new transactions (ex: ERC20) into groups of transactions that belong to the same
    // cache (ex: same ERC20 token)
    let transactionFamilies = new Map<string, TransactionType[]>();
    newTransactions.forEach(t => {
      let providerTransactionInfo = this.getProviderTransactionInfo(t);
      if (!transactionFamilies.has(providerTransactionInfo.cacheKey))
        transactionFamilies.set(providerTransactionInfo.cacheKey, []);

      transactionFamilies.get(providerTransactionInfo.cacheKey).push(t);
    });

    let familiesEntries = Array.from(transactionFamilies.entries());
    for (let j = 0; j < familiesEntries.length; j++) {
      let transactionFamily = familiesEntries[j];
      let cache = await this.getCache(transactionFamily[0]); // cache key

      for (let i = 0; i < transactionFamily[1].length; i++) {
        let familyTransactions = transactionFamily[1]; // Transactions list for this family
        let transaction = familyTransactions[i];
        let providerTransactionInfo = this.getProviderTransactionInfo(transaction);

        cache.set(providerTransactionInfo.cacheEntryKey, transaction, providerTransactionInfo.cacheTimeValue);

        // NOTE: SLOW if many transactions
        let transactions = this.getTransactionsSafe(providerTransactionInfo.cacheKey);
        let existingTransactionIndex = transactions.findIndex(t => {
          let checkedTransactionInfo = this.getProviderTransactionInfo(t);
          return checkedTransactionInfo.cacheEntryKey === providerTransactionInfo.cacheEntryKey;
        });
        if (!existingTransactionIndex) {

        }

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
    });
  } */

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