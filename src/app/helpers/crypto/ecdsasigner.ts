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

import { ec as EC } from "elliptic";
import { SHA256 } from "./sha256";

export class EcdsaSigner {
    public static sign(privateKey: Buffer | string, digest: Buffer): Buffer {
        const ec = new EC('p256');
        const key = ec.keyFromPrivate(privateKey, 'hex')
        const signature = key.sign(digest);
        return Buffer.from(signature.r.toString("hex", 64) + signature.s.toString("hex", 64), "hex");
    }

    public static signData(privateKey: Buffer | string, ...data: Buffer[]): Buffer {
        return this.sign(privateKey, SHA256.encodeToBuffer(...data));
    }

    public static verify(publicKey: Buffer | string, signature: Buffer, data: Buffer): boolean {
        const ec = new EC('p256');

        const key = ec.keyFromPublic(publicKey, 'hex');

        const rs = { r: signature.slice(0, 32).toString("hex"), s: signature.slice(32).toString("hex") };

        return key.verify(data, rs)
    }

    public static verifyData(publicKey: Buffer | string, sig: Buffer, ...data: Buffer[]): boolean {
        return this.verify(publicKey, sig, SHA256.encodeToBuffer(...data));
    }

    public static sha256Digest(...inputs: Buffer[]): Buffer {
        return SHA256.encodeToBuffer(...inputs)
    }


}
