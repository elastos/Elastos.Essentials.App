import { Injectable } from '@angular/core';
import { AnySubWallet, SubWallet } from '../model/wallets/subwallet';
import { StandardCoinName } from '../model/Coin';
import * as moment from 'moment';
import BigNumber from 'bignumber.js';
import { LocalStorage } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UiService {

  public returnedUser = true;

  constructor(
    private storage: LocalStorage
  ) { }

  async init() {
    await this.getVisit();
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

    return subwallet.getFriendlyName();
  }

  getSubwalletSubtitle(subwallet: AnySubWallet): string {
    if (!subwallet) {
      return '';
    }
    return subwallet.getDisplayTokenName();
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
          return balance.decimalPlaces(6).toString();
        } else if (balance.isGreaterThanOrEqualTo(100) && balance.isLessThan(1000)) {
          return balance.decimalPlaces(4).toString();
        } else if (balance.isGreaterThanOrEqualTo(1000) && balance.isLessThan(10000)) {
          return balance.decimalPlaces(2).toString();
        } else {
          return balance.dividedBy(1000).toFixed(0) + 'k';
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
}
