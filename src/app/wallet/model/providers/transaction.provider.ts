import { BehaviorSubject, Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalLanguageService } from "src/app/services/global.language.service";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { GlobalNotificationsService } from "src/app/services/global.notifications.service";
import { ERC20Coin, StandardCoinName, TokenAddress } from "../coin";
import { ERCTokenInfo } from "../evm.types";
import { NFTType } from "../nfts/nft";
import { NetworkWallet } from "../wallets/networkwallet";
import { AnySubWallet, SubWallet } from "../wallets/subwallet";
import { AnySubWalletTransactionProvider } from "./subwallet.provider";
import { GenericTransaction } from "./transaction.types";

/**
 * Class that allows networks to fetch and refresh transactions in background, or when the UI needs more.
 * Normally, one TransactionProvider per network should be implemented.
 *
 * WORKFLOW:
 * - Transactions providers run background tasks to listen to new transactions
 *    - So that we can notify users of:
 *      - Newly received transactions for subwallets that are visible
 *      - Newly received ERC20 tokens or NFTs
 * - Transactions caches are used as a display cache to be able to view some transactions offline or just
 *   after entering the transactions list.
 *    - The cache is loaded from disk
 *    - The cache maintains at most 100 transactions on disk (the most recent)
 *    - The cache can contain many transactions in memory (orders by time value)
 *    - UI relies on this cache for display.
 *    - Caches are filled by more fetches (and sorted by date) either when UI requests it, or by some background tasks
 * - When user enters the transactions list:
 *    - We first display the cache (ex: all of 100 items, no pagination, provided by the provider after loading from the cache)
 *    - We request to fetch the latest transactions for the subwallet.
 *    - Event is sent with the whole transactions by the provider.
 * - When user scrolls down on transactions list:
 *    - If we reach the end of the transactions list, if the provider "can fetch more" then we ask the provider
 *    to fetch more and we will get the new transactions as event.
 */
export abstract class TransactionProvider<TransactionType extends GenericTransaction> {
  // When loading from cache initially, or fetching new transactions from RPC
  protected _transactionsListChanged: Map<StandardCoinName | TokenAddress, BehaviorSubject<void>>;
  // Whether a fetch (real network fetch, not from cache) is in progress or not
  protected _transactionFetchStatusChanged: Map<StandardCoinName | TokenAddress, BehaviorSubject<boolean>>;
  // TODO: make protected like _transactionsListChanged
  // TODO public newTransactionReceived: Map<StandardCoinName | TokenAddress, Subject<NewTransaction>>; // Transactions seen for the first time - not emitted the very first time (after wallet import - initial fetch)
  public newTokenReceived: Subject<ERCTokenInfo>; // erc 20 + erc 721 tokens that are seen for the first time.
  // List of running timers
  private runningTasks: Map<any, void>;

  public fetchTransactionTimestamp = 0;

  constructor(protected networkWallet: NetworkWallet) {
    this._transactionsListChanged = new Map();
    this._transactionFetchStatusChanged = new Map();
    // TODO this.newTransactionReceived = new Map();
    this.newTokenReceived = new Subject();
    this.runningTasks = new Map();
  }

  /**
   * Starts the provider so it can periodically search for new transactions and tokens.
   */
  public abstract start();

  /**
   * Stops the provider. For instance, when the network is changed.
   * At this time, transactions should stop to be refreshed.
   *
   * May be overriden by child classes
   */
  public stop(): Promise<void> {
    // Stop all timers / refresh tasks
    for (let tasksTimeoutHandles of Array.from(this.runningTasks.keys())) {
      this.runningTasks.delete(tasksTimeoutHandles);
      clearTimeout(tasksTimeoutHandles);
    }

    return;
  }

  protected abstract getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider;

  /**
   * Returns transactions currently in cache.
   */
  public getTransactions(subWallet: SubWallet<GenericTransaction>): Promise<TransactionType[]> {
    return this.getSubWalletTransactionProvider(subWallet).getTransactions(subWallet);
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.getSubWalletTransactionProvider(subWallet).canFetchMoreTransactions(subWallet);
  }

  /**
   * Fetch the most recent transactions from network.
   */
  public async fetchNewestTransactions(subWallet: AnySubWallet) {
    // Make sure to not fetch when we are already fetching
    if (this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).value === true) {
      Logger.warn("wallet", "fetchNewestTransactions() skipped. Transactions fetch already in progress");
      return;
    }

    // Fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(true);

    // Fetch
    await this.getSubWalletTransactionProvider(subWallet).fetchTransactions(subWallet);

    // Not fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(false);

    this.fetchTransactionTimestamp = (new Date()).valueOf();
  }

  /**
   * Fetch more transactions after the given transaction. If afterTransactions is not given,
   * the currently last transaction in the cache is used to fetch more after it.
   */
  public async fetchMoreTransactions(subWallet: AnySubWallet, afterTransaction?: TransactionType) {
    // Make sure to not fetch when we are already fetching
    if (this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).value === true) {
      Logger.warn("wallet", "fetchMoreTransactions() skipped. Transactions fetch already in progress");
      return;
    }

    if (!afterTransaction) {
      // Compute the current last transaction to start fetching after that one.
      let currentTransactions = await this.getTransactions(subWallet);
      afterTransaction = currentTransactions[currentTransactions.length - 1];
    }

    // Fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(true);

    // Fetch
    await this.getSubWalletTransactionProvider(subWallet).fetchTransactions(subWallet, afterTransaction);

    // Not fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(false);
  }

  public updateTransactions(subWallet: AnySubWallet, transactons: TransactionType[]) {
    return this.getSubWalletTransactionProvider(subWallet).saveTransactions(transactons);
  }

  /* public prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    return this.getSubWalletTransactionProvider(subWallet).prepareTransactions(subWallet);
  } */

  /**
   * Subject that informs listeners whenever the transactions list gets updated.
   */
  public transactionsListChanged(coinID: StandardCoinName | TokenAddress): BehaviorSubject<void> {
    if (!this._transactionsListChanged.has(coinID))
      this._transactionsListChanged.set(coinID, new BehaviorSubject(null));
    return this._transactionsListChanged.get(coinID);
  }

  /**
   * Subject that informs listeners whether transactions are being fetched or not
   */
  public transactionsFetchStatusChanged(coinID: StandardCoinName | TokenAddress): BehaviorSubject<boolean> {
    if (!this._transactionFetchStatusChanged.has(coinID))
      this._transactionFetchStatusChanged.set(coinID, new BehaviorSubject(false));
    return this._transactionFetchStatusChanged.get(coinID);
  }

  /**
   * Starts a task right now and repeats it X milliseconds after its completion.
   */
  protected refreshEvery(repeatingTask: () => Promise<void>, repeatMs: number) {
    void this.callAndRearmTask(repeatingTask, repeatMs);
  }

  private async callAndRearmTask(repeatingTask: () => Promise<void>, repeatMs: number): Promise<void> {
    await repeatingTask();

    // Only restart a timer after all current operations are complete. We don't want to use an internal
    // that would create many slow updates in parrallel.
    let timeoutHandle = setTimeout(() => {
      this.runningTasks.delete(timeoutHandle);
      void this.callAndRearmTask(repeatingTask, repeatMs);
    }, repeatMs);
    this.runningTasks.set(timeoutHandle);
  }

  /**
   * Internal method called by providers / subwallet providers when they get an info about discovered tokens.
   * This method can be called for previously discovered tokens or for new tokens, no need to manually
   * do a preliminary filter.
   *
   * This method will add new coins to the coin list and notify user that new tokens have arrived if needed.
   */
  public async onTokenInfoFound(tokens: ERCTokenInfo[]) {
    let newAllCoinsList: ERCTokenInfo[] = [];
    let newERC20CoinsList: string[] = [];
    const timestamp = (new Date()).valueOf();

    let activeNetworkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    // For each ERC token discovered by the wallet SDK, we check its type and handle it.
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (token.type === "ERC-20") {
        if (token.symbol && token.name) {
          if (!this.networkWallet.getSubWallet(token.symbol) && !this.networkWallet.network.isCoinDeleted(token.contractAddress)) {
            try {
              // Check if we already know this token globally. If so, we add it as a new subwallet
              // to this master wallet. Otherwise we add the new token to the global list first then
              // add a subwallet as well.
              const erc20Coin = this.networkWallet.network.getERC20CoinByContractAddress(token.contractAddress);
              if (!erc20Coin) {
                const newCoin = new ERC20Coin(token.symbol, token.name, token.contractAddress, parseInt(token.decimals), activeNetworkTemplate, true, false, timestamp);
                if (await this.networkWallet.network.addCustomERC20Coin(newCoin)) {
                  // Find new coin.
                  newERC20CoinsList.push(token.symbol);
                  newAllCoinsList.push(token);
                  if (token.hasOutgoTx) {
                    try {
                      // Create the sub Wallet (ex: IDChain)
                      await this.networkWallet.createNonStandardSubWallet(newCoin);
                    } catch (error) {
                      Logger.error('wallet', 'onTokenInfoFound createNonStandardSubWallet error: ', error);
                    }
                  }
                }
              }
            } catch (e) {
              Logger.log("wallet", 'updateERC20TokenList exception:', e);
            }
          }
        } else {
          Logger.warn('wallet', 'Token has no name or symbol:', token);
        }
      }
      else if (token.type === "ERC-721") {
        if (!this.networkWallet.containsNFT(token.contractAddress)) {
          await this.networkWallet.createNFT(NFTType.ERC721, token.contractAddress, Number.parseInt(token.balance));
          // TODO: let user know, should be a different notification than for ERC20 and the click
          // should bring to wallet home, not to coins list
        }
      }
      else if (token.type === "ERC-1155") {
        console.log("ON 1155 TOKEN FOUND", token);
        if (!this.networkWallet.containsNFT(token.contractAddress)) {
          await this.networkWallet.createNFT(NFTType.ERC1155, token.contractAddress, Number.parseInt(token.balance));
          // TODO: let user know, should be a different notification than for ERC20 and the click
          // should bring to wallet home, not to coins list
        }
      }
      else {
        Logger.warn('wallet', 'Unhandled token type:', token);
      }
    }

    // Found new coins - notify user
    if (newERC20CoinsList.length > 0) {
      this.sendTokenDiscoveredNotification(newERC20CoinsList);
    }

    // Emit the new token event for other listeners
    newAllCoinsList.map(coin => {
      this.newTokenReceived.next(coin);
    });
  }

  /**
   * Lets user know that new tokens have been found, through a in-app notification.
   */
  private sendTokenDiscoveredNotification(newCoinList: string[]) {
    let message = "";
    if (newCoinList.length === 1) {
      message = GlobalLanguageService.instance.translate('wallet.find-new-token-msg', { network: this.networkWallet.network.name, token: newCoinList[0] });
    } else {
      message = GlobalLanguageService.instance.translate('wallet.find-new-tokens-msg', { network: this.networkWallet.network.name, count: newCoinList.length });
    }

    const notification = {
      app: App.WALLET,
      key: 'newtokens',
      title: GlobalLanguageService.instance.translate('wallet.find-new-token'),
      message: message,
      url: '/wallet/coin-list'
    };
    void GlobalNotificationsService.instance.sendNotification(notification);
  }
}
