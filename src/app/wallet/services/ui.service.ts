import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import * as moment from 'moment';
import { AnySubWallet } from '../model/networks/base/subwallets/subwallet';
import { WalletSortType } from '../model/walletaccount';
import { LocalStorage } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UiService {

  public returnedUser = true;
  private walletSortType = WalletSortType.NAME;

  constructor(
    private storage: LocalStorage
  ) { }

  async init() {
    await this.getVisit();
    void this.loadSortType();
  }

  async getVisit(): Promise<void> {
    let visited = await this.storage.getVisit();
    if (visited) {
      this.returnedUser = true;
    } else {
      this.returnedUser = false;
    }
  }

  getSubwalletTitle(subwallet: AnySubWallet): string {
    if (!subwallet) {
      return '';
    }

    return subwallet.getDisplayTokenName();
  }

  getSubwalletSubtitle(subwallet: AnySubWallet): string {
    if (!subwallet) {
      return '';
    }
    return subwallet.getFriendlyName();
  }

  /**
   * Returns a string representation of an asset value, with user friendly rounding to avoid long
   * numbers with many decimals.
   */
  getFixedBalance(balance: BigNumber): string {
    try {
      // let balance = new BigNumber("172400");
      if (balance.isZero()) {
        return String(0);
      } else if (balance.isNaN()) {
        return String('...');
      } else if (balance.isLessThan(100)) {
        return balance.decimalPlaces(6).toFixed();
      } else if (balance.isGreaterThanOrEqualTo(100) && balance.isLessThan(1000)) {
        return balance.decimalPlaces(4).toFixed();
      } else if (balance.isGreaterThanOrEqualTo(1000) && balance.isLessThan(10000)) {
        return balance.decimalPlaces(2).toFixed();
      } else if (balance.isGreaterThanOrEqualTo(10000) && balance.isLessThan(1000000)) {
        return balance.dividedBy(1000).toFixed(2) + 'k';
      } else {
        return balance.dividedBy(1000000).toFixed(2) + 'm';
      }
    } catch (e) {
      // The old wallet use number for balance, and save the wallet info to localstorage.
      // So the balance form localstorage maybe isn't bigNumber.
      return String(0);
    }
  }

  getSyncDate(timestamp) {
    return moment(new Date(timestamp)).format();
  }

  getSyncTimeFromNow(timestamp) {
    const today = moment();
    const month = moment().subtract(30, 'days');
    if (moment(timestamp).isSame(today, 'd')) {
      return moment(timestamp).calendar();
    } else if (moment(timestamp).isBetween(month, today)) {
      return moment(timestamp).format('MMM Do, h:mm a');
    } else {
      return moment(timestamp).format('MMM Do YYYY');
    }
  }

  // Wallet sort type
  public async loadSortType() {
    this.walletSortType = await this.storage.get('walletsorttype');
    if (!this.walletSortType) {
      this.walletSortType = WalletSortType.NAME;
    }
  }

  public getWalletSortType() {
    return this.walletSortType;
  }

  public async setWalletSortTtype(sortType: WalletSortType) {
    await this.storage.set('walletsorttype', sortType);
    this.walletSortType = sortType;
  }
}
