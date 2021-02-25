
import { Injectable } from '@angular/core';

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
    
    public static isEmptyObject(obj): boolean {
        for (let key in obj) {
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
            newObj = new Array();
        } else {
            newObj = new Object();
        }
  
        for (let i in Obj)
            newObj[i] = this.clone(Obj[i]);
  
        return newObj;
    }
}
