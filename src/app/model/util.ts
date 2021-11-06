
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';

@Injectable()
export class Util {
    public static uuid(len, radix): string {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
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

    // TODO: not enough for other western languages like french.
    static english(text): boolean {
        var pattern = new RegExp("[A-Za-z]+");
        return pattern.test(text);
    }

    static chinese(text): boolean {
        var pattern = new RegExp("[\u4E00-\u9FA5]+");
        return pattern.test(text);
    }

    static japanese(text): boolean {
        var pattern = new RegExp("[\u0800-\u4e00]+");
        return pattern.test(text);
    }

    /*E-mail*/
    static email(text): boolean {
        const email = /^[a-zA-Z0-9.!#$%&*+=?^_{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        return email.test(text);
    }

    static phone(text): boolean {
        const mPattern = /^((13[0-9])|(14[5|7])|(15([0-3]|[5-9]))|(18[0,5-9]))\d{8}$/;
        return mPattern.test(text);
    }

    static username(text): boolean {
        var uPattern = /^[a-zA-Z0-9_-]{4,16}$/;
        return uPattern.test(text);
    }

    static password(text): boolean {
        if (text.length < 8) {
            return false;
        }
        return true;
        //var pPattern = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{8,16}$/;
        //return pPattern.test(text);

    }

    static number(text): boolean {
        // var numPattern = /^(([1-9]\d*)|0)(\.\d{1,2})?$"/;
        // var numPattern = /^-?\d*\.?\d+$/;
        var numPattern = /^(([1-9]\d*)|\d)(\.\d{1,9})?$/;
        return numPattern.test(text);
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

    public static isEmptyObject(obj): boolean {
        for (let key in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }

    public static isNull(data): boolean {
        return (data === '' || data === undefined || data === null) ? true : false;
    }

    public static clone(Obj) {
        if (typeof (Obj) != 'object') return Obj;
        if (Obj == null) return Obj;

        let newObj;

        if (Obj instanceof (Array)) {
            newObj = [];
        } else {
            newObj = new Object();
        }

        for (let i in Obj)
            newObj[i] = this.clone(Obj[i]);

        return newObj;
    }

    public static didStringToDir(didString: string): string {
        return didString.replace(/:/g, "_");
    }

    public static reverseHexToBE(digest: string): string {
        let buf = Buffer.from(digest, "hex");
        return buf.reverse().toString("hex");
    }

    public static accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try { m += s1.split(".")[1].length } catch (e) { }
        try { m += s2.split(".")[1].length } catch (e) { }

        return Math.floor(Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m))
    }

    // ceil(12345, 1000) => 13000
    public static ceil(number: number, near = 0) {
      if (near <= 0) {
        // Auto ceil, keep 2 number, ceil(1234567, 0) => 1300000
        let integerDigit = Math.ceil(number).toString().length;
        if (integerDigit <= 2) {
          return Math.ceil(number);
        }
        let newNear = Math.pow(10, integerDigit - 2);
        return Math.ceil(number / newNear) * newNear;
      } else {
        return Math.ceil(number / near) * near;
      }
    }

    static dateFormat(date: Date, format = 'YYYY-MM-DD HH:mm:ss') {
        return moment(date).format(format);
    }

    public static timestampToDateTime(timestamp = Date.now(), format = 'yyyy-MM-dd HH:mm:ss') {
        if (isNaN(timestamp)) {
            return '';
        }

       if (format.length < 4 || 'yyyy-MM-dd HH:mm:ss'.indexOf(format) !== 0) {
            return '';
        }

        const date = new Date(Number(timestamp));

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        return format.replace('yyyy', year.toString())
            .replace('MM', month > 9 ? month.toString() : `0${month}`)
            .replace('dd', day > 9 ? day.toString() : `0${day}`)
            .replace('HH', hour > 9 ? hour.toString() :`0${hour}`)
            .replace('mm', minute > 9 ? minute.toString() : `0${minute}`)
            .replace('ss', second > 9 ? second.toString() : `0${second}`);
    }

    public static getTimestamp(): number {
        var timestamp = (new Date()).valueOf();
        return timestamp;
    }

    /**
     * Converts a base-10 or base-16 string representation of a number (ex: "140" or "0xA45F" into
     * a base-10 string representation (ex: "140"->"140", "0xA45F"->"42079")
     */
     public static getDecimalString(numberString: string) {
        if (numberString.startsWith('0x')) {
            return (new BigNumber(numberString)).toFixed();
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
