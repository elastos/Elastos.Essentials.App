import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { ERC20Coin } from '../model/coin';
import { Network } from '../model/networks/network';
import { TimeBasedPersistentCache } from '../model/timebasedpersistentcache';
import { WalletNetworkService } from './network.service';
import { LocalStorage } from './storage.service';
import { UniswapCurrencyService } from './uniswap.currency.service';

const TOKEN_VALUE_REFRESH_DELAY = (60 * 5); // 5 minutes - Number of seconds without refreshing a token price if alerady in cache

type DisplayableCurrency = {
  symbol: string;
  name: string;
  icon: string;
};

export const displayableCurrencies: DisplayableCurrency[] = [
  {
    symbol: 'USD',
    name: 'wallet.united-states-dollar',
    icon: '/assets/wallet/currencies/usd.png'
  },
  {
    symbol: 'CNY',
    name: 'wallet.chinese-yuan',
    icon: '/assets/wallet/currencies/cny.png'
  },
  {
    symbol: 'BTC',
    name: 'wallet.bitcoin',
    icon: '/assets/wallet/currencies/btc.png'
  }
];

// List of symbol -> value in USD
type ExchangeRateCache = { [symbol: string]: number };

type CachedTokenPrice = {
  usdValue: number; // Valuation of this token in USD
  //fetchTimestamp: number; // Timestamp (seconds) at which this information was last fetched
}

/**
 * - For the main tokens (ELA, ETH, BNB...) we rely on elaphant api's data in USD.
 * - We also use the elaphant API to compute ratios between USD and CNY/BTC, using any arbitrary entry in the returned list.
 * - For ERC20 tokens, we use uniswap protocols on each network to get tokens valuations.
 */
@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  public static instance: CurrencyService = null;

  private stopService = false;

  //private tokenSymbol = 'ELA';
  //public tokenStats: ElaphantPriceAPITokenStats;
  private exchangeRates: ExchangeRateCache = {};
  private pricesCache: TimeBasedPersistentCache<CachedTokenPrice>; // Cache that contains latest prices for all tokens (native and ERC)
  private tokenFetchOnGoing = false;

  // Use currency as main wallet total amount
  public useCurrency = false;

  public selectedCurrency: DisplayableCurrency;

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private globalStorage: GlobalStorageService,
    private walletNetworkService: WalletNetworkService,
    private uniswapCurrencyService: UniswapCurrencyService
  ) {
    CurrencyService.instance = this;
  }

  async init() {
    this.stopService = false;

    // Load or create a cache and store this cache globally to share fetched values among several DID users.
    this.pricesCache = await TimeBasedPersistentCache.loadOrCreate("tokenprices", true);

    /*  WalletNetworkService.instance.activeNetwork.subscribe(activeNetwork => {
       if (activeNetwork) {
         this.fetch();
       }
     }); */

    //this.tokenSymbol = WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
    await this.loadExchangeRates();
    await this.getSavedPrices();
    await this.getSavedCurrency();
    await this.getSavedCurrencyDisplayPreference();

    // Wait a moment before fetching latest prices, to not struggle the main essentials boot sequence.
    /* runDelayed(() => {
      if (!this.stopService) {
        this.fetch();
      }
    }, 10000); */

    Logger.log('wallet', "Currency service initialization complete");
  }

  stop() {
    this.stopService = true;
  }

  public getDisplayableCurrencies(): DisplayableCurrency[] {
    return displayableCurrencies;
  }

  /**
   * Loads previously stored exchange rates from disk, if any.
   */
  private async loadExchangeRates(): Promise<void> {
    let defaultRates: ExchangeRateCache = {};
    this.exchangeRates = await this.globalStorage.getSetting(null, "wallet", "exchangerates", defaultRates);
  }

  private async saveExchangeRates(): Promise<void> {
    await this.globalStorage.setSetting(null, "wallet", "exchangerates", this.exchangeRates);
  }

  getSavedPrices(): Promise<void> {
    return new Promise((resolve, reject) => {
      /* this.currencies.forEach((currency) => {
        void this.storage.getPrice(currency.symbol).then((price) => {
          //Logger.log('wallet', 'Saved ela price', currency.symbol, price);
          price ? currency.price = price : currency.price = 0;
        });
      }); */
      resolve();
    });
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

  /**
   * Fetches prices from the elaphant api and returns only a target item
   */
  private fetchTokenStatsFromElaphant(symbol: string): Promise<ElaphantPriceAPITokenStats> {
    Logger.log("wallet", "Fetching elaphant api prices for symbol", symbol);
    this.tokenFetchOnGoing = true;
    return new Promise(resolve => {
      this.http.get<any>('https://api-price.elaphant.app/api/1/cmc?limit=600').subscribe((res: ElaphantPriceAPITokenStats[]) => {
        this.tokenFetchOnGoing = false;
        if (res) {
          let tokenStats = res.find((coin) => coin.symbol === symbol);
          resolve(tokenStats);
        }
      }, (err) => {
        Logger.error('wallet', 'Fetch CMC Stats err', err);
        this.tokenFetchOnGoing = false;
        resolve(null);
      });
    })
  }

  // Saves user's choice about which display currency to use: USD, CNY, BTC...
  async saveCurrency(currency: DisplayableCurrency): Promise<void> {
    this.selectedCurrency = currency;
    await this.storage.setCurrency(currency.symbol);
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
    return new BigNumber(usdValue.multipliedBy(this.exchangeRates[currencySymbol] ?? 0));
  }

  /**
   * Returns the current valuation of the given native token (ELA, HT, BNB), in the active currency by default,
   * or in the given currency.
   * Ex: 30 ELA -> 300 USD
   */
  public getMainTokenValue(quantity: BigNumber, network?: Network, currencySymbol = this.selectedCurrency.symbol): BigNumber | null {
    if (!network)
      network = this.walletNetworkService.activeNetwork.value;

    if (!quantity || quantity.isNaN())
      return null;

    if (quantity.eq(0))
      return new BigNumber(0);

    // return cache if not expired
    let cacheKey = network.key + network.getMainTokenSymbol();
    let tokenValue = this.pricesCache.get(cacheKey);
    let currentTime = Date.now() / 1000;
    let shouldFetch = false;
    if (!tokenValue || currentTime - tokenValue.timeValue > TOKEN_VALUE_REFRESH_DELAY) {
      // Item expired or missing, we will have to fetch fresh data
      shouldFetch = true;
    }

    if (shouldFetch && !this.tokenFetchOnGoing) {
      void this.fetchTokenStatsFromElaphant(network.getMainTokenSymbol()).then(tokenStats => {
        if (tokenStats) {
          this.computeExchangeRatesFromElaphantTokenStats(tokenStats);

          this.pricesCache.set(cacheKey, {
            usdValue: parseFloat(tokenStats.price_usd)
          }, currentTime);
        }
        else {
          this.pricesCache.set(cacheKey, {
            usdValue: 0
          }, currentTime);
        }
        void this.pricesCache.save();
      });
    }

    if (!tokenValue) {
      return null;
    }
    else {
      // Return the currently cached value
      let tokenUsdtValue = quantity.multipliedBy(tokenValue.data.usdValue);
      return this.usdToCurrencyAmount(tokenUsdtValue, currencySymbol).decimalPlaces(2);
    }
  }

  // ERC20 tokens
  public getERC20TokenValue(quantity: BigNumber, coin: ERC20Coin, network?: Network, currencySymbol = this.selectedCurrency.symbol): BigNumber | null {
    if (!network)
      network = this.walletNetworkService.activeNetwork.value;

    if (!quantity || quantity.isNaN())
      return null;

    if (quantity.eq(0))
      return new BigNumber(0);

    // return cache if not expired
    let cacheKey = network.key + coin.getContractAddress();
    let tokenValue = this.pricesCache.get(cacheKey);
    let currentTime = Date.now() / 1000;
    let shouldFetch = false;
    if (!tokenValue || currentTime - tokenValue.timeValue > TOKEN_VALUE_REFRESH_DELAY) {
      // Item expired or missing, we will have to fetch fresh data
      shouldFetch = true;
    }

    // Logger.log("walletdebug", "Should fetch?", shouldFetch);

    if (shouldFetch && !this.tokenFetchOnGoing) {
      this.tokenFetchOnGoing = true;
      void this.uniswapCurrencyService.getTokenUSDValue(network, coin).then(value => {
        this.tokenFetchOnGoing = false;
        this.pricesCache.set(cacheKey, {
          usdValue: value
        }, currentTime);
      });
    }

    if (!tokenValue) {
      return null;
    }
    else {
      // Return the currently cached value
      let tokenUsdtValue = quantity.multipliedBy(tokenValue.data.usdValue);
      return this.usdToCurrencyAmount(tokenUsdtValue, currencySymbol).decimalPlaces(2);
    }
  }

  /**
   * From a token's valuation in BTC/CNY/USD from elaphant, we "compute" the BTC/USD and CNY/USD exchange
   * rates used for display.
   */
  private computeExchangeRatesFromElaphantTokenStats(tokenStats: ElaphantPriceAPITokenStats) {
    this.exchangeRates["USD"] = 1.0;
    this.exchangeRates["CNY"] = parseFloat(tokenStats.price_cny) / parseFloat(tokenStats.price_usd);
    this.exchangeRates["BTC"] = parseFloat(tokenStats.price_btc) / parseFloat(tokenStats.price_usd);

    void this.saveExchangeRates();
  }
}

type ElaphantPriceAPITokenStats = {
  "24h_volume_btc": string;
  "24h_volume_cny": string;
  "24h_volume_usd": string;
  available_supply: string;
  id: string;
  last_updated: string;
  local_system_time: string;
  market_cap_btc: string;
  market_cap_cny: string;
  market_cap_usd: string;
  max_supply: string;
  name: string;
  num_market_pairs: string;
  percent_change_1h: string;
  percent_change_7d: string;
  percent_change_24h: string;
  platform_symbol: string;
  platform_token_address: string;
  price_btc: string;
  price_cny: string;
  price_usd: string;
  rank: string;
  symbol: string;
  total_supply: string;
  _id: string;
};