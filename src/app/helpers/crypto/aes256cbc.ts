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

import createHash from "create-hash";
import { createCipheriv, createDecipheriv } from "crypto";
import { BASE64 } from "./base64";

export class Aes256cbc {
    public static encrypt(plain: Buffer, passwd: string): Buffer {
        let { key, iv } = Aes256cbc.generateKeyAndIv(passwd);

        let cipher = createCipheriv('aes-256-cbc', key, iv);
        return Buffer.concat([cipher.update(plain), cipher.final()]);
    }

    public static decrypt(secret: Buffer, passwd: string): Buffer {
        let { key, iv } = this.generateKeyAndIv(passwd);

        let decipher = createDecipheriv('aes-256-cbc', key, iv);
        return Buffer.concat([decipher.update(secret), decipher.final()]);
    }

    public static encryptToBase64(plain: Buffer, passwd: string): string {
        let secret = this.encrypt(plain, passwd);
        return BASE64.toUrlFormat(secret.toString("base64"))
    }

    public static decryptFromBase64(base64Secret: string, passwd: string): Buffer {
        let secret = Buffer.from(BASE64.fromUrlFormat(base64Secret), "base64")
        return Aes256cbc.decrypt(secret, passwd);
    }

    private static generateKeyAndIv(passwd: string): { key: Buffer, iv: Buffer } {

        let bufferPassword: Buffer = Buffer.from(passwd, "utf-8")

        let first16KeyBytesInHex = createHash('md5')
            .update(bufferPassword)
            .digest();

        let last16KeyBytesInHex = createHash('md5')
            .update(first16KeyBytesInHex)
            .update(bufferPassword)
            .digest()

        let iv = createHash('md5')
            .update(last16KeyBytesInHex)
            .update(bufferPassword)
            .digest();

        return {
            key: Buffer.concat([first16KeyBytesInHex, last16KeyBytesInHex]),
            iv
        };
    }
}
