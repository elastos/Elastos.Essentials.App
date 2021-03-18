import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorage } from './storage.service';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';

type Currency = {
  symbol: string;
  name: string;
  price: number;
  icon: string;
};

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  public static instance: CurrencyService = null;

  public elaStats: any;
  // cors-anywhere: CORS Anywhere is a NodeJS proxy which adds CORS headers to the proxied request.
  private proxyurl = "https://sheltered-wave-29419.herokuapp.com/";

  // Use currency as main wallet total amount
  public useCurrency = false;

  public selectedCurrency: Currency;
  public currencies: Currency[] = [
    {
      symbol: 'USD',
      name: 'united-states-dollar',
      price: 0,
      icon: '/assets/wallet/currencies/usd.png'
    },
    {
      symbol: 'CNY',
      name: 'chinese-yuan',
      price: 0,
      icon: '/assets/wallet/currencies/cny.png'
    },
    {
      symbol: 'BTC',
      name: 'bitcoin',
      price: 0,
      icon: '/assets/wallet/currencies/btc.png'
    }
  ];

  constructor(
    private http: HttpClient,
    private storage: LocalStorage
  ) {
    CurrencyService.instance = this;
  }

  async init() {
    await this.getSavedPrices();
    await this.getSavedCurrency();
    await this.getSavedCurrencyDisplayPreference();
    this.fetch();

    Logger.log('wallet', "Currency service initialization complete");
  }

  getSavedPrices(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currencies.forEach((currency) => {
        this.storage.getPrice(currency.symbol).then((price) => {
          Logger.log('wallet', 'Saved ela price', currency.symbol, price);
          price ? currency.price = price : currency.price = 0;
        });
      });
      resolve();
    });
  }

  getSavedCurrency(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.getCurrency().then((symbol) => {
        Logger.log('wallet', "Got storage currency", symbol);
        if (symbol) {
          this.selectedCurrency = this.currencies.find((currency) => currency.symbol === symbol);
          Logger.log('wallet', 'Currency saved', this.selectedCurrency);
        } else {
          this.selectedCurrency = this.currencies.find((currency) => currency.symbol === 'USD');
          Logger.log('wallet', 'No currency saved, using default USD', this.selectedCurrency);
        }
        resolve();
      });
    });
  }

  getSavedCurrencyDisplayPreference(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.getCurrencyDisplayPreference().then((useCurrency) => {
        Logger.log('wallet', 'Got stored currency display preference', useCurrency);
        if (useCurrency) {
          this.useCurrency = useCurrency;
        }
        resolve();
      });
    });
  }

  fetch() {
    // TODO: Get price by token name.
    this.http.get<any>(this.proxyurl + 'https://api-price.elaphant.app/api/1/cmc?limit=500').subscribe((res) => {
      Logger.log('wallet', 'Got CMC response', res);
      this.elaStats = res.find((coin) => coin.symbol === 'ELA');
      if (this.elaStats) {
        Logger.log('wallet', 'CMC ELA stats', this.elaStats);
        this.addPriceToCurrency();
      }
    }, (err) => {
      Logger.error('wallet', 'Fetch CMC Stats err', err);
    });
  }

  async addPriceToCurrency() {
    this.currencies.map((currency) => {
      if (currency.symbol === 'USD') {
        this.storage.setPrice(currency.symbol, this.elaStats.price_usd);
        currency.price = parseFloat(this.elaStats.price_usd);
      }
      if (currency.symbol === 'CNY') {
        this.storage.setPrice(currency.symbol, this.elaStats.price_cny);
        currency.price = parseFloat(this.elaStats.price_cny);
      }
      if (currency.symbol === 'BTC') {
        this.storage.setPrice(currency.symbol, this.elaStats.price_btc);
        currency.price = parseFloat(this.elaStats.price_btc);
      }
    });
    Logger.log('wallet', 'Currency ELA prices updated', this.currencies);
  }

  /**
   * NOTE: for now, this API converts amounts in ELA to values in user's selected currencies only.
   */
  getCurrencyBalance(cryptoBalance: BigNumber): BigNumber {
    if (!cryptoBalance) {
      return null;
    }

    const currencyPrice = new BigNumber(this.selectedCurrency.price);
    const currencyBalance = currencyPrice.multipliedBy(cryptoBalance);
    if (cryptoBalance.isZero()) {
      return new BigNumber(0);
    } else if (this.selectedCurrency.symbol === 'BTC') {
      return currencyBalance.decimalPlaces(4);
    } else {
      return currencyBalance.decimalPlaces(2);
    }
  }

  saveCurrency(currency: Currency) {
    this.selectedCurrency = currency;
    this.storage.setCurrency(currency.symbol);
  }

  toggleCurrencyDisplay() {
    this.useCurrency = !this.useCurrency;
    this.storage.setCurrencyDisplayPreference(this.useCurrency);
  }
}
