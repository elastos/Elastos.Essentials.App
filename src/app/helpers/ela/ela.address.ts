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

import { lazyEllipticImport } from "../import.helper";
import { Base58 } from "./../crypto/base58";
import { SHA256 } from "./../crypto/sha256";

export enum ELAAddressSignType {
  SignTypeInvalid = 0,
  SignTypeStandard = 0xAC,
  SignTypeDID = 0xAD,
  SignTypeMultiSign = 0xAE,
  SignTypeCrossChain = 0xAF,
  SignTypeDestroy = 0xAA,
}

export enum ELAAddressPrefix {
  PrefixStandard = 0x21,
  PrefixMultiSign = 0x12,
  PrefixCrossChain = 0x4B,
  PrefixCRExpenses = 0x1C,
  PrefixDeposit = 0x1F,
  PrefixIDChain = 0x67,
  PrefixDestroy = 0,
}

export class ELAAddressHelper {

  static async getAddressFromPublicKey(publicKey: string): Promise<string> {
    let publicKeyBuffer = Buffer.from(publicKey, 'hex');
    let programHash = this.getSingleSignProgramHash(publicKeyBuffer)
    let address = await this.getAddressFromProgramHash(programHash)
    return address;
  }

  static getProgramHashFromAddress(address) {
    return Base58.decode(address).slice(0, 21);
  }

  static async getAddressFromProgramHash(programHash: Buffer): Promise<string> {
    const SmartBuffer = (await import("smart-buffer")).SmartBuffer;
    const f = SmartBuffer.fromBuffer(SHA256.hashTwice(programHash));
    const g = new SmartBuffer();
    g.writeBuffer(programHash);
    g.writeBuffer(f.readBuffer(4));
    const gBuffer = g.toBuffer();
    const address = Base58.encode(gBuffer);
    return address;
  }

  static async getPublic(privateKey): Promise<string> {
    const rawPrivateKey = Buffer.from(privateKey, 'hex');

    const { ec } = await lazyEllipticImport();
    let curve = new ec('P256');

    const keypair = curve.keyFromPrivate(rawPrivateKey);
    const publicKey = this.getPublicEncoded(keypair, true);
    return publicKey.toString('hex');
  }

  static getPublicEncoded = (keypair, encode) => {
    const unencodedPubKey = Buffer.from(keypair.getPublic().encode());
    if (!Buffer.isBuffer(unencodedPubKey)) {
      throw Error('unencodedPubKey must be a Buffer ' + unencodedPubKey);
    }
    if (encode) {
      return this.getPublicKeyEncoded(unencodedPubKey);
    } else {
      return unencodedPubKey;
    }
  }

  static getSingleSignatureRedeemScript(pubkey, signType: ELAAddressSignType) {
    const script = this.createSingleSignatureRedeemScript(pubkey, signType);
    const scriptBuffer = Buffer.from(script);
    const scriptBufferHex = scriptBuffer.toString('hex').toUpperCase();
    return scriptBufferHex;
  }

  private static getSingleSignProgramHash(publicKeyBuffer: Buffer) {
    return this.toCodeHash(this.createSingleSignatureRedeemScript(publicKeyBuffer));
  }

  private static toCodeHash(code) {
    const f = SHA256.sha256ripemd160(code);
    const g = new Uint8Array(f.length + 1);
    g[0] = ELAAddressPrefix.PrefixStandard;
    this.arraycopy(f, 0, g, 1, f.length);
    return Buffer.from(g);
  }

  private static createSingleSignatureRedeemScript(publicKey: Buffer, signType: ELAAddressSignType = ELAAddressSignType.SignTypeStandard) {
    const pubkey = this.getPublicKeyEncoded(publicKey);
    const script = new Uint8Array(35);
    script[0] = ELAAddressPrefix.PrefixStandard;
    this.arraycopy(pubkey, 0, script, 1, 33);
    script[34] = signType;
    return script;
  }

  private static getPublicKeyEncoded(publicKey) {
    if (!Buffer.isBuffer(publicKey)) {
      throw Error('publicKey must be a Buffer');
    }

    if ((publicKey.length == 33)) {
      return publicKey;
    }
    let encoded;
    if (publicKey[64] % 2 === 1) {
      encoded = '03' + publicKey.slice(1, 33).toString('hex').toUpperCase();
    } else {
      encoded = '02' + publicKey.slice(1, 33).toString('hex').toUpperCase();
    }
    return Buffer.from(encoded, 'hex');
  }

  private static arraycopy(from, fromIx, to, toIx, length) {
    for (let i = 0; i < length; i++) {
      to[i + toIx] = from[i + fromIx];
    }
  }
}