/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import BigNumber from 'bignumber.js';
import { Network, validate } from 'bitcoin-address-validation';

import moment from 'moment';
import { Logger } from 'src/app/logger';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { CurrencyService } from '../services/currency.service';
// import { langFr as fr } from "@ethersproject/wordlists/lib/lang-fr";
// import { langIt as it } from "@ethersproject/wordlists/lib/lang-it";
// import { langZhCn as zh_cn } from "@ethersproject/wordlists/lib/lang-zh";
import { wordlists } from 'ethers';

export class WalletUtil {
  static isInvalidWalletName(text): boolean {
    if (text.length > 30) {
      return true;
    }
    return false;
    //var pPattern = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{8,16}$/;
    //return pPattern.test(text);
  }

  public static getWholeBalance(balance: BigNumber): string {
    if (!balance || balance.isNaN()) {
      return '...';
    }
    return balance.dividedToIntegerBy(1).toFixed();
  }

  public static getDecimalBalance(balance: BigNumber, decimalplace = -1): string {
    if (!balance || balance.isNaN()) {
      return '';
    }

    if (decimalplace == -1) {
      decimalplace = CurrencyService.instance.selectedCurrency.decimalplace;
      if (!decimalplace) {
        decimalplace = 3;
      }
    }
    let minBalanceToShow = 1 / Math.pow(10, decimalplace);
    const decimalBalance = balance.modulo(1);
    if (decimalBalance.gt(minBalanceToShow)) {
      // BigNumber.ROUND_DOWN:  0.9997 => 0.999
      // Default round mode:  0.9997 => 1
      const fixedDecimalBalance = decimalBalance.decimalPlaces(decimalplace, BigNumber.ROUND_DOWN).toFixed().substring(2);
      return fixedDecimalBalance;
    } else if (decimalBalance.isZero()) {
      return '';
    } else {
      return '000';
    }
  }

  public static getAmountWithoutScientificNotation(amount: BigNumber | number, precision: number): string {
    let amountString = amount.toFixed();
    if (amountString.indexOf('e') != -1) {
      return amount.toFixed(precision).replace(/0*$/g, "");
    } else {
      // const maxLength = amountString.indexOf('.') + 11;
      // if (maxLength < amountString.length) {
      //   amountString = amountString.substring(0, maxLength)
      // }
      return amountString;
    }
  }

  /**
   * @param timestamp Timestamp ins seconds or milliseconds
   */
  public static getDisplayDate(timestamp: number) {
    if (timestamp > 2147483647)
      timestamp = timestamp / 1000; // Convert MS to seconds

    const today = moment(new Date()).startOf('day').valueOf();
    return timestamp < today ? moment.unix(timestamp).format("YYYY-MM-DD HH:mm") : moment.unix(timestamp).startOf('minutes').fromNow();
  }

  public static isELAAddress(address: string) {
    Logger.warn('wallet', 'The implementation is missing. Later we will replace with elastos JS wallet sdk api!');
    return true;
  }

  public static isBTCAddress(address: string) {
    let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
    return validate(address, network.toLowerCase() as Network)
  }

  public static async isEVMAddress(address: string): Promise<boolean> {
    const isAddress = (await import('web3-utils')).isAddress;
    return isAddress(address);
  }

  public static async getMnemonicWordlist(mnemonic: string) {
    let wordlistKey = ['en', 'zh_cn', 'fr', 'it']

      // default: wordlists['en']
      // wordlists['zh_cn'] = zh_cn;
      // wordlists['fr'] = fr;
      // wordlists['it'] = it;

      // Avoid multiple consecutive spaces in the string
      let mnemonicArray = mnemonic.split(/[\u3000\s]+/);
      for (let index = 0; index < wordlistKey.length; index++) {
        let key = wordlistKey[index];
        if (!wordlists[key]) {
          switch (key) {
            case 'zh_cn':
              const zh_cn = (await import("@ethersproject/wordlists/lib/lang-zh")).langZhCn;
              wordlists['zh_cn'] = zh_cn;
            break;
            case 'fr':
              const fr = (await import("@ethersproject/wordlists/lib/lang-fr")).langFr;
              wordlists['fr'] = fr;
            break;
            case 'it':
              const it = (await import("@ethersproject/wordlists/lib/lang-it")).langIt;
              wordlists['it'] = it;
            break;
          }
        }

        let i = 0;
        for (i = 0; i < mnemonicArray.length; i++) {
          let index = wordlists[key].getWordIndex(mnemonicArray[i])
          if (index == undefined || index < 0) break;
        }
        if (i == mnemonicArray.length) {
          Logger.log('wallet', 'getMnemonicWordlist find wordlist', key)
          return wordlists[key];
        }
      }
  }
}
