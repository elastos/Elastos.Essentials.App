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

import { SmartBuffer } from "smart-buffer";
import { Logger } from "../../logger";
import { lazyEllipticImport } from "../import.helper";
import { SHA256 } from "./../crypto/sha256";
import { ELAAddressHelper, ELAAddressSignType } from "./ela.address";
import { ELATransactionCoder } from "./ela.transaction.coder";
// eslint-disable-next-line @typescript-eslint/no-var-requires

const SignerLength = 32;
const SignatureLength = 64;

export class ELATransactionSigner {

  static async getSignature(tx, privateKey): Promise<Buffer> {
    const encodedTxHex = await ELATransactionCoder.encodeTx(tx, false);

    const signatureHex = await this.buffer_sign(encodedTxHex, privateKey);

    const signature = Buffer.from(signatureHex, 'hex');
    return signature;
  }

  static addSignatureToTx(tx, publicKey, signature): Promise<string> {
    const signatureParameter = new SmartBuffer();
    signatureParameter.writeInt8(signature.length);
    signatureParameter.writeBuffer(signature);
    const signatureParameterHex = signatureParameter.toString('hex').toUpperCase();

    const publicKeyRaw = Buffer.from(publicKey, 'hex');

    const code = ELAAddressHelper.getSingleSignatureRedeemScript(publicKeyRaw, ELAAddressSignType.SignTypeStandard);

    const Program = {
      Code: code,
      Parameter: signatureParameterHex
    };

    tx.Programs = [];
    tx.Programs.push(Program);

    Logger.warn('wallet', 'addSignatureToTx:', tx)
    return ELATransactionCoder.encodeTx(tx, true);
  }

  static async buffer_sign(bufferHex, privateKeyHex): Promise<string> {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const hash = SHA256.sha256Hash(bufferHex);

    const { ec } = await lazyEllipticImport();
    let curve = new ec('P256');

    const signature = curve.sign(hash, privateKey, null);

    const r = signature.r.toArrayLike(Buffer, 'be', 32).toString('hex').toUpperCase();

    const s = signature.s.toArrayLike(Buffer, 'be', 32).toString('hex').toUpperCase();

    let signatureHex = r;
    while (signatureHex.length < SignerLength) {
      signatureHex = '0' + signatureHex;
    }

    signatureHex += s;

    while (signatureHex.length < SignatureLength) {
      signatureHex = '0' + signatureHex;
    }

    return signatureHex;
  }

  static async signTx(tx, privateKey): Promise<string> {
    const signature = this.getSignature(tx, privateKey);
    const publicKey = await ELAAddressHelper.getPublic(privateKey);
    return this.addSignatureToTx(tx, publicKey, signature);
  }
}