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
import { SHA256 } from "./../crypto/sha256";
import { ELAAddressHelper } from "./ela.address";
import { ELATransactionCoder } from "./ela.transaction.coder";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EC = require('elliptic').ec;
const curve = new EC('p256');

const SignerLength = 32;
const SignatureLength = 64;

export class ELATransactionSigner {

  static getSignature(tx, privateKey) {
    const encodedTxHex = ELATransactionCoder.encodeTx(tx, false);

    const signatureHex = this.buffer_sign(encodedTxHex, privateKey);

    const signature = Buffer.from(signatureHex, 'hex');
    return signature;
  }

  static addSignatureToTx(tx, publicKey, signature) {
    const signatureParameter = new SmartBuffer();
    signatureParameter.writeInt8(signature.length);
    signatureParameter.writeBuffer(signature);
    const signatureParameterHex = signatureParameter.toString('hex').toUpperCase();

    const publicKeyRaw = Buffer.from(publicKey, 'hex');

    const code = ELAAddressHelper.getSingleSignatureRedeemScript(publicKeyRaw, 1);

    const Program = {
      Code : code,
      Parameter : signatureParameterHex
    };

    tx.Programs = [];
    tx.Programs.push(Program);

    Logger.warn('wallet', 'addSignatureToTx:', tx)
    return ELATransactionCoder.encodeTx(tx, true);
  }

  static buffer_sign(bufferHex, privateKeyHex) {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const hash = SHA256.sha256Hash(bufferHex);

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

  static signTx(tx, privateKey) {
    const signature = this.getSignature(tx, privateKey);
    const publicKey = ELAAddressHelper.getPublic(privateKey);
    return this.addSignatureToTx(tx, publicKey, signature);
  }
}