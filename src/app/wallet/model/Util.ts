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
import { Config } from "../config/Config";
import * as moment from 'moment';
import BigNumber from 'bignumber.js';

export class Util {

    public static getTimestamp(): number {
        var timestamp = (new Date()).valueOf();
        return timestamp;
    }

    /*E-mail*/
    static email(text): boolean {
        const email = /^[a-zA-Z0-9.!#$%&*+=?^_{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        return email.test(text);
    };

    static phone(text): boolean {
        const mPattern = /^((13[0-9])|(14[5|7])|(15([0-3]|[5-9]))|(18[0,5-9]))\d{8}$/;
        return mPattern.test(text);
    };

    static username(text): boolean {
        var uPattern = /^[a-zA-Z0-9_-]{4,16}$/;
        return uPattern.test(text);
    };

    static password(text): boolean {
        if (text.length < 8) {
            return false;
        }
        return true;
        //var pPattern = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{8,16}$/;
        //return pPattern.test(text);

    };
    static number(text): boolean {
        // var numPattern = /^(([1-9]\d*)|0)(\.\d{1,2})?$"/;
        // var numPattern = /^-?\d*\.?\d+$/;
        var numPattern = /^(([1-9]\d*)|\d)(\.\d{1,9})?$/;
        return numPattern.test(text);
    };

    // TODO: not enough for other western languages like french.
    static english(text): boolean {
        var pattern = new RegExp("[A-Za-z]+");
        return pattern.test(text);
    };

    static chinese(text): boolean {
        var pattern = new RegExp("[\u4E00-\u9FA5]+");
        return pattern.test(text);
    };

    static japanese(text): boolean {
        var pattern = new RegExp("[\u0800-\u4e00]+");
        return pattern.test(text);
    };

    public static isNull(data): boolean {
        return (data === '' || data === undefined || data === null) ? true : false;
    }

    public static isMnemonicValid(mnemonicStr): boolean {
        return mnemonicStr.split(/[\u3000\s]+/).length == 12 ? true : false
    }

    public static isAddressValid(address): boolean {
        return address.length === 34 ? true : false
    }


    public static isEmptyObject(obj): boolean {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }

    static dateFormat(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss') {
        return moment(date).format(format);
    }

    public static checkCellphone(cellphone: string): boolean {
        if (!(/^1[3|4|5|8|9|7][0-9]\d{4,8}$/.test(cellphone))) {
            return true;
        }
        return false;
    }

    public static objtoarr(obj) {
        let arr = [];
        for (let key in obj) {
            arr.push(obj[key]);
        }
        return arr;
    }

    public static GetQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return decodeURI(r[2]); return null;
    }

    public static isCardNo(card: string): boolean {
        if (!(/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(card))) {
            return true;
        }
        return false;
    }

    public static isBankCard(bankCard: string): boolean {
        var regex = /^(998801|998802|622525|622526|435744|435745|483536|528020|526855|622156|622155|356869|531659|622157|627066|627067|627068|627069|622588)\d{10}$/;
        if (!regex.test(bankCard)) {
            return true;
        }
        return false;
    }


    static isWalletName(text): boolean {
        if (text.length > 30) {
            return true;
        }
        return false;
        //var pPattern = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{8,16}$/;
        //return pPattern.test(text);

    };

    static scientificToNumber(num) {
        let str = num.toString();
        let reg = /^(\d+)(e)([\-]?\d+)$/;
        let arr, len,
            zero = '';

        /*6e7或6e+7 都会自动转换数值*/
        if (!reg.test(str)) {
            return num;
        } else {
            /*6e-7 需要手动转换*/
            arr = reg.exec(str);
            len = Math.abs(arr[3]) - 1;
            for (var i = 0; i < len; i++) {
                zero += '0';
            }

            return '0.' + zero + arr[1];
        }
    }

    static isNodeName(text): boolean {
        if (text.length > 30) {
            return true;
        }
        return false;
    }

    static isURL(domain): boolean {
        var name = /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/;
        if (!(name.test(domain))) {
            return false;
        }
        else {
            return true;
        }
    }

    public static uuid(len = 36, radix = 19): string {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) {
                uuid[i] = chars[0 | Math.random() * radix];
            }
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data. At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return uuid.join('');
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

        // const decimalBalance = new BigNumber('4.999999');
        const decimalBalance = balance.modulo(1);
        const fixedDecimalBalance = decimalBalance.toNumber().toString().slice(2, 5);
        return fixedDecimalBalance;
    }

    /**
     * Converts a base-10 or base-16 string representation of a number (ex: "140" or "0xA45F" into
     * a base-10 string representation (ex: "140"->"140", "0xA45F"->"42079")
     */
    public static getDecimalString(numberString: string) {
        if (numberString.startsWith('0x')) {
            return parseInt(numberString, 16).toString();
        } else {
            return numberString;
        }
    }

    /**
     * Reverse txid, eg. '65c1af8a' => '8aafc165'.
     * For get address in cross chain transaction.
     */
    public static reversetxid(txid) {
      let newtxid = ''
      for (let i = txid.length - 2; i >= 0; i -= 2) {
        newtxid += txid.substring(i, i + 2);
      }
      return newtxid
    }
}
