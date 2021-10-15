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
    return balance.dividedToIntegerBy(1).toString();
  }

  public static getDecimalBalance(balance: BigNumber): string {
    if (!balance || balance.isNaN()) {
      return '';
    }

    const decimalBalance = balance.modulo(1);
    if (decimalBalance.gt(0.001)) {
      const fixedDecimalBalance = decimalBalance.toNumber().toString().slice(2, 5);
      return fixedDecimalBalance;
    } else if (decimalBalance.isZero()) {
      return '';
    } else {
      return '000';
    }
  }

  public static getAmountWithoutScientificNotation(amount: BigNumber | number, precision: number): string {
    let amountString = amount.toString();
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
}
