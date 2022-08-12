import { BehaviorSubject, Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalLanguageService } from "src/app/services/global.language.service";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { GlobalNotificationsService } from "src/app/services/global.notifications.service";
import { ERC20CoinService } from "../../services/evm/erc20coin.service";
import { ERC20Coin, StandardCoinName, TokenAddress } from "../coin";
import { AnyNetworkWallet } from "../networks/base/networkwallets/networkwallet";
import { AnySubWallet, SubWallet } from "../networks/base/subwallets/subwallet";
import { EVMNetwork } from "../networks/evms/evm.network";
import { ERCTokenInfo, TransactionListType } from "../networks/evms/evm.types";
import { NFTType } from "../networks/evms/nfts/nft";
import { AnySubWalletTransactionProvider } from "./subwallet.provider";
import { AnyOfflineTransaction, GenericTransaction } from "./transaction.types";

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

  protected isRunning = false;

  constructor(protected networkWallet: AnyNetworkWallet) {
    this._transactionsListChanged = new Map();
    this._transactionFetchStatusChanged = new Map();
    // TODO this.newTransactionReceived = new Map();
    this.newTokenReceived = new Subject();
    this.runningTasks = new Map();
  }

  /**
   * Starts the provider so it can periodically search for new transactions and tokens.
   */
  public start() {
    this.isRunning = true;
  }

  /**
   * Stops the provider. For instance, when the network is changed.
   * At this time, transactions should stop to be refreshed.
   *
   * May be overriden by child classes
   */
  public stop(): Promise<void> {
    this.isRunning = false;

    // Stop all timers / refresh tasks
    for (let tasksTimeoutHandles of Array.from(this.runningTasks.keys())) {
      this.runningTasks.delete(tasksTimeoutHandles);
      clearTimeout(tasksTimeoutHandles);
    }

    return;
  }

  protected abstract getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider;

  protected abstract getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider;

  /**
   * Returns transactions currently in cache.
   */
  public getTransactions(subWallet: SubWallet<GenericTransaction, any>, transactionListType = TransactionListType.NORMAL): Promise<TransactionType[]> {
    if (transactionListType === TransactionListType.NORMAL) {
      return this.getSubWalletTransactionProvider(subWallet)?.getTransactions(subWallet, transactionListType);
    } else {
      if (subWallet.supportInternalTransactions()) {
        return this.getSubWalletInternalTransactionProvider(subWallet)?.getTransactions(subWallet, transactionListType);
      } else {
        return null;
      }
    }
  }

  public getOfflineTransactions(subWallet: SubWallet<GenericTransaction, any>): Promise<AnyOfflineTransaction[]> {
    return this.getSubWalletTransactionProvider(subWallet)?.getOfflineTransactions();
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.getSubWalletTransactionProvider(subWallet)?.canFetchMoreTransactions(subWallet);
  }

  /**
   * Fetch the most recent transactions from network.
   */
  public async fetchNewestTransactions(subWallet: AnySubWallet, transactionListType = TransactionListType.NORMAL) {
    // Make sure to not fetch when we are already fetching
    if (this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).value === true) {
      Logger.warn("wallet", "fetchNewestTransactions() skipped. Transactions fetch already in progress");
      return;
    }

    // Fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(true);

    // Fetch
    if (transactionListType === TransactionListType.NORMAL) {
      let provider = this.getSubWalletTransactionProvider(subWallet);
      if (!provider) {
        Logger.warn("wallet", "fetchNewestTransactions(): no transaction provider");
      }
      else
        await provider.fetchTransactions(subWallet);
    } else {
      if (subWallet.supportInternalTransactions()) {
        let provider = this.getSubWalletInternalTransactionProvider(subWallet);
        if (!provider) {
          Logger.warn("wallet", "fetchNewestTransactions(): no internal transaction provider");
        }
        else
          await provider.fetchTransactions(subWallet);
      }
    }

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
      if (currentTransactions)
        afterTransaction = currentTransactions[currentTransactions.length - 1];
    }

    // Fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(true);

    // Fetch
    await this.getSubWalletTransactionProvider(subWallet)?.fetchTransactions(subWallet, afterTransaction);

    // Not fetching
    this.transactionsFetchStatusChanged(subWallet.getUniqueIdentifierOnNetwork()).next(false);
  }

  public updateTransactions(subWallet: AnySubWallet, transactons: TransactionType[]) {
    return this.getSubWalletTransactionProvider(subWallet).saveTransactions(transactons);
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
  public refreshEvery(repeatingTask: () => Promise<void>, repeatMs: number) {
    void this.callAndRearmTask(repeatingTask, repeatMs);
  }

  private async callAndRearmTask(repeatingTask: () => Promise<void>, repeatMs: number): Promise<void> {
    await repeatingTask();

    // Don't rearm task after call stop. (Sometimes it takes a long time to execute the repeatingTask.)
    if (!this.isRunning) return;

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
   *
   * NOTE: This method must be called only once (per refresh) with all tokens together, because it resets the NFTs list.
   */
  public async onTokenInfoFound(tokens: ERCTokenInfo[]) {
    let allNewCoinsList: ERCTokenInfo[] = [];
    let newERC20CoinsList: string[] = [];
    const timestamp = (new Date()).valueOf();

    let network = <EVMNetwork>this.networkWallet.network;
    let activeNetworkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    // For each ERC token discovered by the wallet SDK, we check its type and handle it.
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (token.type === "ERC-20") {
        if (token.symbol && token.name) {
          if (!this.networkWallet.getSubWallet(token.symbol) && !network.isCoinDeleted(token.contractAddress)) {
            try {
              // Check if we already know this token globally. If so, we add it as a new subwallet
              // to this master wallet. Otherwise we add the new token to the global list first then
              // add a subwallet as well.
              const erc20Coin = network.getERC20CoinByContractAddress(token.contractAddress);
              if (!erc20Coin) {
                let tokenDecimal;
                if (!token.decimals) {
                  // The token has no decimals for fusion network.
                  tokenDecimal = await ERC20CoinService.instance.getCoinDecimals(network, token.contractAddress);
                  token.decimals = tokenDecimal.toString();
                } else {
                  tokenDecimal = parseInt(token.decimals);
                }
                const newCoin = new ERC20Coin(token.symbol, token.name, token.contractAddress, tokenDecimal, activeNetworkTemplate, true, false, timestamp);
                if (await network.addCustomERC20Coin(newCoin)) {
                  // Find new coin.
                  newERC20CoinsList.push(token.symbol);
                  allNewCoinsList.push(token);
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
              Logger.log("wallet", 'onTokenInfoFound exception:', e);
            }
          }
        } else {
          Logger.warn('wallet', 'Token has no name or symbol:', token);
        }
      }
      else if (token.type === "ERC-721") {
        // We can possibly have a balance, but not the tokens IDs list. So we update the balance to show the right
        // number on UI first, and we will fetch tokens IDs later when use enters coin-home
        //
        // NOTE: We get ONE token info entry uniquely per NFT contract, not several.
        await this.networkWallet.upsertNFT(NFTType.ERC721, token.contractAddress, Number.parseInt(token.balance), token.tokenIDs, token.name);
      }
      else if (token.type === "ERC-1155") {
        await this.networkWallet.upsertNFT(NFTType.ERC1155, token.contractAddress, Number.parseInt(token.balance), token.tokenIDs, token.name);
      }
      else {
        Logger.warn('wallet', 'Unhandled token type:', token);
      }
    }

    // TODO: let user know about new NFTs if any (notif)

    // Found new coins - notify user
    if (newERC20CoinsList.length > 0) {
      this.sendTokenDiscoveredNotification(newERC20CoinsList);
    }

    // Emit the new token event for other listeners
    allNewCoinsList.map(coin => {
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
