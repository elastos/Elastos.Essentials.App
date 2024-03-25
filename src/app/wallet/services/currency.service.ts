import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { BehaviorSubject } from 'rxjs';
import { runDelayed, sleep } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { GlobalCosmosService } from 'src/app/services/global.cosmos.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { ERC20Coin, TRC20Coin } from '../model/coin';
import type { EVMNetwork } from '../model/networks/evms/evm.network';
import type { AnyNetwork } from '../model/networks/network';
import { TimeBasedPersistentCache } from '../model/timebasedpersistentcache';
import { DexScreenerCurrencyService } from './evm/dexscreener.currency.service';
import { UniswapCurrencyService } from './evm/uniswap.currency.service';
import { WalletNetworkService } from './network.service';
import { LocalStorage } from './storage.service';

const TOKEN_VALUE_REFRESH_DELAY = 20;//(60 * 5); // 5 minutes - Number of seconds without refreshing a token price if alerady in cache

type DisplayableCurrency = {
  symbol: string;
  name: string;
  icon: string;
  decimalplace: number; // The higher the price, the more decimal places.
};

export const displayableCurrencies: DisplayableCurrency[] = [
  {
    symbol: 'CNY',
    name: 'wallet.chinese-yuan',
    icon: '/assets/wallet/currencies/cny.svg',
    decimalplace: 2
  },
  {
    symbol: 'CZK',
    name: 'wallet.czk-koruna',
    icon: '/assets/wallet/currencies/czk.svg',
    decimalplace: 2
  },
  {
    symbol: 'EUR',
    name: 'wallet.euro',
    icon: '/assets/wallet/currencies/eur.svg',
    decimalplace: 2
  },
  {
    symbol: 'GBP',
    name: 'wallet.british-pound',
    icon: '/assets/wallet/currencies/gbp.svg',
    decimalplace: 2
  },
  {
    symbol: 'JPY',
    name: 'wallet.japanese-yen',
    icon: '/assets/wallet/currencies/jpy.svg',
    decimalplace: 2
  },
  {
    symbol: 'USD',
    name: 'wallet.united-states-dollar',
    icon: '/assets/wallet/currencies/usd.svg',
    decimalplace: 2
  },
  {
    symbol: 'BTC',
    name: 'wallet.bitcoin',
    icon: '/assets/wallet/currencies/btc.svg',
    decimalplace: 6
  }
];

// List of symbol -> value in USD
type ExchangeRateCache = { [symbol: string]: number };

type CachedTokenPrice = {
  usdValue: number; // Valuation of this token in USD
  //fetchTimestamp: number; // Timestamp (seconds) at which this information was last fetched
}

/**
 * - For the main tokens (ELA, ETH, BNB...) we rely on price api's data in USD.
 * - For ERC20 tokens, we use uniswap protocols on each network to get tokens valuations.
 */
@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  public static instance: CurrencyService = null;

  private networkMainTokenPrice = {};
  private updateInterval = null;
  public pricesFetchedSubject = new BehaviorSubject<boolean>(false);
  public currencyChangedSubject = new BehaviorSubject<string>('');

  private exchangeRates: ExchangeRateCache = {};
  private pricesCache: TimeBasedPersistentCache<CachedTokenPrice>; // Cache that contains latest prices for all tokens (native and ERC)

  // Use currency as main wallet total amount
  public useCurrency = false;

  public selectedCurrency: DisplayableCurrency;

  private tokenPriceUrl = 'https://essentials-api.elastos.io/api/v1/price';
  private usdExchangeRateUrl = 'https://currencies.elastos.io/latest?from=USD';

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private globalStorage: GlobalStorageService,
    private walletNetworkService: WalletNetworkService,
    private uniswapCurrencyService: UniswapCurrencyService,
    private dexScreenerCurrencyService: DexScreenerCurrencyService
  ) {
    CurrencyService.instance = this;
  }

  async init() {
    // Load or create a cache and store this cache globally to share fetched values among several DID users.
    this.pricesCache = await TimeBasedPersistentCache.loadOrCreate("tokenprices", true);

    await this.loadAllTokenSymbol();
    await this.loadExchangeRates();
    await this.getSavedCurrency();
    await this.getSavedCurrencyDisplayPreference();

    // Don't block the init, run asynchronously
    runDelayed(async () => {
      let retryTimes = 0;
      let isPriceUpdated = false;

      // If the update fails, try again
      // Let users see the latest prices as soon as possible
      do {
        isPriceUpdated = await this.updateExchangeRatesAndPrice();
        if (!isPriceUpdated) {
          await sleep(1000);
        }
      } while (!isPriceUpdated && retryTimes++ < 3)

      this.updateInterval = setInterval(() => {
        void this.updateExchangeRatesAndPrice();
      }, 30000);// 30s
    }, 1000);

    Logger.log('wallet', "Currency service initialization complete");
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateExchangeRatesAndPrice() {
    try {
      await this.computeExchangeRatesFromCurrenciesService();
      await this.fetchTokenStatsFromPriceService();
      await this.fetchTokenStatsFromCosmosService();
      return true;
    } catch (e) {
      Logger.warn('wallet', "Failed to update exchange rates and price", e);
      return false;
    }
  }

  public getDisplayableCurrencies(): DisplayableCurrency[] {
    return displayableCurrencies;
  }

  public getDisplayableCurrencyBySymbol(symbol: string): DisplayableCurrency {
    return displayableCurrencies.find(dc => dc.symbol === symbol);
  }

  private async loadAllTokenSymbol() {
    this.networkMainTokenPrice = await this.globalStorage.getSetting(null, null, "wallet", "maintokenprice", {});

    let networks = this.walletNetworkService.getAvailableNetworks();
    for (let i = 0; i < networks.length; i++) {
      let tokenSymbol = networks[i].getMainTokenSymbol()
      if (!this.networkMainTokenPrice[tokenSymbol])
        this.networkMainTokenPrice[tokenSymbol] = null;
    }
  }

  private async saveMainTokenPrice(): Promise<void> {
    await this.globalStorage.setSetting(null, null, "wallet", "maintokenprice", this.networkMainTokenPrice);
  }

  /**
   * Loads previously stored exchange rates from disk, if any.
   */
  private async loadExchangeRates(): Promise<void> {
    let defaultRates: ExchangeRateCache = {};
    this.exchangeRates = await this.globalStorage.getSetting(null, null, "wallet", "exchangerates", defaultRates);
    this.exchangeRates['USD'] = 1;
  }

  private async saveExchangeRates(): Promise<void> {
    await this.globalStorage.setSetting(null, null, "wallet", "exchangerates", this.exchangeRates);
  }

  async getSavedCurrency(): Promise<void> {
    let symbol = await this.storage.getCurrency();
    Logger.log('wallet', "Got storage currency", symbol);
    if (symbol) {
      this.selectedCurrency = displayableCurrencies.find((currency) => currency.symbol === symbol);
      Logger.log('wallet', 'Currency saved', this.selectedCurrency);
    } else {
      this.selectedCurrency = displayableCurrencies.find((currency) => currency.symbol === 'USD');
      Logger.log('wallet', 'No currency saved, using default USD', this.selectedCurrency);
    }

    this.currencyChangedSubject.next(this.selectedCurrency.symbol);
  }

  /**
   * Whether to show prices in native token (ELA, HT...) or in selected UI currency (USD, CNY...)
   */
  async getSavedCurrencyDisplayPreference(): Promise<void> {
    let useCurrency = await this.storage.getCurrencyDisplayPreference();
    //Logger.log('wallet', 'Got stored currency display preference', useCurrency);
    if (useCurrency) {
      this.useCurrency = useCurrency;
    }
  }

  private pricesFetched(): Promise<boolean> {
    return new Promise(resolve => {
      // Wait until we receive the price fetched completion signal. Could be instant or pending a http call
      this.pricesFetchedSubject.subscribe(fetched => {
        if (fetched)
          resolve(true);
      });
    });
  }

  /**
   * Fetches prices from the price api and returns only a target item
   */
  private fetchTokenStatsFromPriceService(): Promise<boolean> {
    Logger.log("wallet", "Fetching token prices");

    return new Promise(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.http.get<any>(this.tokenPriceUrl).subscribe(async (res: PriceAPITokenStats[]) => {
        if (res) {
          for (let tokenSymbol in this.networkMainTokenPrice) {
            let tokenStats = res[tokenSymbol];
            if (tokenStats) {
              this.networkMainTokenPrice[tokenSymbol] = tokenStats;
            }
            // else {
            //   this.networkMainTokenPrice[tokenSymbol] = null;
            // }
          }
          // Set exchange for BTC => USD
          this.exchangeRates['BTC'] = parseFloat((1 / res['BTC']).toFixed(8));
          void this.saveMainTokenPrice();
          void this.saveExchangeRates();

          await this.updateAllNetworkMainTokenValue();
          this.pricesFetchedSubject.next(true);
          // Logger.log('wallet', 'All Token price:', this.networkMainTokenPrice);
          resolve(true);
        }
        else {
          resolve(false);
        }
      }, (err) => {
        Logger.error('wallet', 'Fetch CMC Stats err', err);
        resolve(false);
      });
    })
  }

  private async fetchTokenStatsFromCosmosService() {
    if (this.walletNetworkService.activeNetwork.value.key == 'atom') {
        let usdValue = await GlobalCosmosService.instance.getAtomPrice();
        if (usdValue) {
            this.networkMainTokenPrice['ATOM'] = usdValue;
        } else {
            this.networkMainTokenPrice['ATOM'] = null;
        }
    }
  }


  // Saves user's choice about which display currency to use: USD, CNY, BTC...
  async saveCurrency(currency: DisplayableCurrency): Promise<void> {
    this.selectedCurrency = currency;
    await this.storage.setCurrency(currency.symbol);
    this.currencyChangedSubject.next(currency.symbol);
  }

  /**
   * Switches the valuation display mode between native token (ELA, HT) and fiat (USD, CNY)
   */
  async toggleCurrencyDisplay(): Promise<void> {
    this.useCurrency = !this.useCurrency;
    await this.storage.setCurrencyDisplayPreference(this.useCurrency);
  }

  /**
   * From a value in USD, returns the value in the active user display's currency by default, or in a given currency.
   * Ex: 5 USD -> 30 CNY
   */
  public usdToCurrencyAmount(usdValue: BigNumber, currencySymbol = this.selectedCurrency.symbol): BigNumber {
    currencySymbol = currencySymbol.toUpperCase();
    return new BigNumber(usdValue.multipliedBy(this.exchangeRates[currencySymbol] || 0));
  }

  /**
   * Returns the current valuation of the given native token (ELA, HT, BNB), in the active currency by default,
   * or in the given currency.
   * Ex: 30 ELA -> 300 USD
   */
  public getMainTokenValue(quantity: BigNumber, network?: AnyNetwork, currencySymbol = this.selectedCurrency.symbol): BigNumber | null {
    if (!network)
      network = this.walletNetworkService.activeNetwork.value;

    if (!quantity || quantity.isNaN())
      return null;

    if (quantity.eq(0))
      return new BigNumber(0);

    // Return cache if existing
    let cacheKey = network.key + network.getMainTokenSymbol();
    let tokenValue = this.pricesCache.get(cacheKey);

    if (!tokenValue) {
      return null;
    }
    else {
      // Return the currently cached value
      let tokenUsdtValue = quantity.multipliedBy(tokenValue.data.usdValue);
      return this.usdToCurrencyAmount(tokenUsdtValue, currencySymbol);
    }
  }

  public async fetchMainTokenValue(quantity: BigNumber, network?: AnyNetwork, currencySymbol = this.selectedCurrency.symbol, pricesFetched = false): Promise<void> {
    let cacheKey = network.key + network.getMainTokenSymbol();
    let currentTime = Date.now() / 1000;
    let priceUpdated = false;

    //void this.pricesCache.delete(); // DEV
    //return;

    if (!pricesFetched)
      await this.pricesFetched();

    let tokenStats = this.networkMainTokenPrice[network.getMainTokenSymbol()];
    if (tokenStats) {
      this.pricesCache.set(cacheKey, {
        usdValue: parseFloat(tokenStats)
      }, currentTime);
      priceUpdated = true;
    }
    else {
      Logger.log("wallet", "No currency in token API for", network.getMainTokenSymbol(), ". Trying other methods");
      if (network.isEVMNetwork()) {
        if ((<EVMNetwork>network).getUniswapCurrencyProvider()) {
            // If this is a EVM network, try to get price from the wrapped ETH on uniswap compatible DEX.
            let usdValue = await this.uniswapCurrencyService.getTokenUSDValue(<EVMNetwork>network, (<EVMNetwork>network).getUniswapCurrencyProvider().getWrappedNativeCoin());
            if (usdValue) {
                this.pricesCache.set(cacheKey, {
                    usdValue
                }, currentTime);
                priceUpdated = true;
            } else {
                Logger.log("wallet", "Can't get", network.getMainTokenSymbol(), "price from uniswap");
            }
        } else if ((<EVMNetwork>network).getDexScreenerCurrencyProvider()) {
            void this.dexScreenerTokenFetch(cacheKey, <EVMNetwork>network, (<EVMNetwork>network).getDexScreenerCurrencyProvider().getWrappedNativeCoin());
        }
      } else {
        this.pricesCache.remove(cacheKey);
      }
    }
    if (priceUpdated)
      void this.pricesCache.save();
  }

  // Update pricesCache
  public async updateAllNetworkMainTokenValue(): Promise<void> {
    let networks = this.walletNetworkService.getDisplayableNetworks();

    for (let i = 0; i < networks.length; i++) {
      await CurrencyService.instance.fetchMainTokenValue(new BigNumber(1), networks[i], 'USD', true);
    }
  }

  // ERC20 tokens
  public getERC20TokenValue(quantity: BigNumber, coin: ERC20Coin | TRC20Coin, network?: AnyNetwork, currencySymbol = this.selectedCurrency.symbol): BigNumber | null {
    if (!network)
      network = this.walletNetworkService.activeNetwork.value;

    if (!quantity || quantity.isNaN())
      return null;

    if (quantity.eq(0))
      return new BigNumber(0);

    // return cache if not expired
    let cacheKey = network.key + coin.getContractAddress();
    let tokenValue = this.pricesCache.get(cacheKey);

    if (!tokenValue) {
      return null;
    }
    else {
      // Return the currently cached value
      let tokenUsdtValue = quantity.multipliedBy(tokenValue.data.usdValue);
      return this.usdToCurrencyAmount(tokenUsdtValue, currencySymbol);
    }
  }

  public fetchERC20TokenValue(coin: ERC20Coin, network?: EVMNetwork): Promise<void> {
    let cacheKey = network.key + coin.getContractAddress();
    if ((<EVMNetwork>network).getUniswapCurrencyProvider()) {
        this.queueUniswapTokenFetch(cacheKey, network, coin);
    } else {
        void this.dexScreenerTokenFetch(cacheKey, network, coin);
    }
    return;
  }

  /**
   * If not already in queue, queue the given coin to be fetched when the current fetch is over.
   * Goal: not overload the RPC API with too many coins balance fetch at once.
   */
  private uniswapTokenFetchQueue: {
    [cacheKey: string]: {
      network: EVMNetwork;
      coin: ERC20Coin;
    }
  } = {};
  private onGoingUniswapTokenFetch: string = null; // Cache key of the token being fetched, if any.
  private queueUniswapTokenFetch(cacheKey: string, network: EVMNetwork, coin: ERC20Coin) {
    if (cacheKey in this.uniswapCurrencyService || cacheKey === this.onGoingUniswapTokenFetch) {
      this.checkFetchNextUniswapToken();
      return; // Token fetch is already queued, don't queue again.
    }

    // Add to queue
    this.uniswapTokenFetchQueue[cacheKey] = { network, coin };

    // Check if a fetch should be started
    this.checkFetchNextUniswapToken();
  }

  private checkFetchNextUniswapToken() {
    if (this.onGoingUniswapTokenFetch === null) {
      // No on going fetch, check if there is something to fetch
      let queueFetches = Object.keys(this.uniswapTokenFetchQueue);
      if (queueFetches.length > 0) {
        let cacheKey = queueFetches[0];
        let { network, coin } = this.uniswapTokenFetchQueue[cacheKey];

        this.onGoingUniswapTokenFetch = cacheKey;
        void this.uniswapCurrencyService.getTokenUSDValue(network, coin).then(value => {
          this.onGoingUniswapTokenFetch = null;
          delete this.uniswapTokenFetchQueue[cacheKey];

          let currentTime = Date.now() / 1000;
          this.pricesCache.set(cacheKey, {
            usdValue: value
          }, currentTime);

          this.checkFetchNextUniswapToken();
        });
      }
    }
  }

  private async dexScreenerTokenFetch(cacheKey: string, network: EVMNetwork, coin: ERC20Coin) {
    let price = await this.dexScreenerCurrencyService.getTokenUSDValue(<EVMNetwork>network, coin);
    // Logger.log('wallet', 'dexScreenerTokenFetch got price:', price, coin);
    if (price) {
        let currentTime = Date.now() / 1000;
        this.pricesCache.set(cacheKey, {
            usdValue: price
        }, currentTime);
    }
  }

  /**
   * Get USD exchange from currencies service.
   */
  private async computeExchangeRatesFromCurrenciesService() {
    let rates = await this.fetchUSDExchangeRate();
    if (rates) {
      for (let i = 0; i < displayableCurrencies.length; i++) {
        if (rates[displayableCurrencies[i].symbol]) {
          this.exchangeRates[displayableCurrencies[i].symbol] = rates[displayableCurrencies[i].symbol]
        }
      }
      Logger.log('wallet', 'computeExchangeRatesFromCurrenciesService ', this.exchangeRates)
      void this.saveExchangeRates();
    }
  }


  /**
   * Get USD exchange from currencies service.
   */
  private fetchUSDExchangeRate() {
    return new Promise(resolve => {
      this.http.get<any>(this.usdExchangeRateUrl).subscribe((res: CurrenciesExchangeRate) => {
        if (res) {
          Logger.log('wallet', 'Fetch USD exchange rate successfully')
          resolve(res.rates);
        }
        else {
          resolve(null);
        }
      }, (err) => {
        Logger.error('wallet', 'Fetch USD exchange rate err', err);
        resolve(null);
      });
    })
  }
}

type CurrenciesExchangeRate = {
  amount: number;
  base: string;
  date: string;
  rates: {
    [symbol: string]: string
  };
}

type PriceAPITokenStats = {
  [symbol: string]: string
}
