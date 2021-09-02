import { Console } from "console";
import { BehaviorSubject, Subject } from "rxjs";
import { StandardCoinName, TokenAddress, TokenType } from "../Coin";
import { TimeBasedPersistentCache } from "../timebasedpersistentcache";
import { GenericTransaction, PaginatedTransactions } from "./transaction.types";
import { NetworkWallet } from "../wallets/networkwallet";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { ProviderTransactionInfo } from "./providertransactioninfo";
import { AnySubWalletTransactionProvider } from "./subwallet.provider";

export type NewTransaction = {
  // TODO
}

export type NewToken = {
  type: TokenType;
  // TODO
}

/**
 * Class that allows networks to fetch and refresh transactions in background, or when the UI needs more.
 * Normally, one TransactionProvider per network should be implemented.
 *
 * WORKFLOW:
 * - Transactions providers run background tasks to listen to new transactions
 *    - So that we can notify users of:
 *      - Newly received transactions for subwallets that are visible
 *      - Newly received ERC20 tokens or NFTs
 * - Transactions caches are used only as a display cache to be able to view some transactions offline or just
 *   after entering the transactions list.
 * - Transaction providers maintain a list of transactions that are:
 *    - First, filled by the disk cache
 *    - Then, filled by more fetches (and sorted by date) either when UI requests it, or by some background tasks
 * - When user enters the transactions list:
 *    - We first display the cache (ex: all of 100 items, no pagination, provided by the provider after loading from the cache)
 *    - We request to fetch the latest transactions for the subwallet.
 *    - Event is sent with the whole transactions by the provider.
 * - When user scrolls down on transactions list:
 *    - If we reach the end of the transactions list, if the provider "can fetch more" then we ask the provider
 *    to fetch more and we will get the new transactions as event.
 */
export abstract class TransactionProvider<TransactionType extends GenericTransaction> {
  protected _transactionsListChanged: Map<StandardCoinName | TokenAddress, BehaviorSubject<void>>; // When loading from cache initially, or fetching new transactions from RPC
  // TODO: make protected like _transactionsListChanged
  public newTransactionReceived: Map<StandardCoinName | TokenAddress, Subject<NewTransaction>>; // Transactions seen for the first time - not emitted the very first time (after wallet import - initial fetch)
  protected newTokenReceived: Subject<NewToken>; // erc 20 + erc 721 tokens that are seen for the first time.

  constructor(protected networkWallet: NetworkWallet) {
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

  protected abstract getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider;

  public getTransactions(subWallet: SubWallet<GenericTransaction>): TransactionType[] {
    return this.getSubWalletTransactionProvider(subWallet).getTransactions(subWallet);
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.getSubWalletTransactionProvider(subWallet).canFetchMoreTransactions(subWallet);
  }

  public fetchNewestTransactions(subWallet: AnySubWallet) {
    return this.getSubWalletTransactionProvider(subWallet).fetchTransactions(subWallet);
  }

  public fetchMoreTransactions(subWallet: AnySubWallet, afterTransaction?: TransactionType) {
    if (!afterTransaction) {
      // Compute the current last transaction to start fetching after that one.
      let currentTransactions = this.getTransactions(subWallet);
      afterTransaction = currentTransactions[currentTransactions.length-1];
    }

    return this.getSubWalletTransactionProvider(subWallet).fetchTransactions(subWallet, afterTransaction);
  }

  public prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    return this.getSubWalletTransactionProvider(subWallet).prepareTransactions(subWallet);
  }

  /**
   * Subject that informs listeners whenever the transactions list gets updated.
   */
  public transactionsListChanged(coinID: StandardCoinName | TokenAddress): BehaviorSubject<void> {
    if (!this._transactionsListChanged.has(coinID))
      this._transactionsListChanged.set(coinID, new BehaviorSubject(null));
    return this._transactionsListChanged.get(coinID);
  }

  /**
   * Starts a task right now and repeats it X milliseconds after its completion.
   */
  protected refreshEvery(repeatingTask: ()=>Promise<void>, repeatMs: number) {
    void this.callAndRearmTask(repeatingTask, repeatMs);
  }

  private async callAndRearmTask(repeatingTask: ()=>Promise<void>, repeatMs: number): Promise<void> {
    await repeatingTask();

    // Only restart a timer after all current operations are complete. We don't want to use an internal
    // that would create many slow updates in parrallel.
    setTimeout(() => {
      void this.callAndRearmTask(repeatingTask, repeatMs);
    }, repeatMs);
  }
}
