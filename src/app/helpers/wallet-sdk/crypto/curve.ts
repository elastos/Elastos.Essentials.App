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

import BN from 'bn.js';
import createHash from 'create-hash';
import * as elliptic from 'elliptic';

const messages = {
    "COMPRESSED_TYPE_INVALID": "compressed should be a boolean",
    "EC_PRIVATE_KEY_TYPE_INVALID": "private key should be a Buffer",
    "EC_PRIVATE_KEY_LENGTH_INVALID": "private key length is invalid",
    "EC_PRIVATE_KEY_RANGE_INVALID": "private key range is invalid",
    "EC_PRIVATE_KEY_TWEAK_ADD_FAIL": "tweak out of range or resulting private key is invalid",
    "EC_PRIVATE_KEY_TWEAK_MUL_FAIL": "tweak out of range",
    "EC_PRIVATE_KEY_EXPORT_DER_FAIL": "couldn't export to DER format",
    "EC_PRIVATE_KEY_IMPORT_DER_FAIL": "couldn't import from DER format",
    "EC_PUBLIC_KEYS_TYPE_INVALID": "public keys should be an Array",
    "EC_PUBLIC_KEYS_LENGTH_INVALID": "public keys Array should have at least 1 element",
    "EC_PUBLIC_KEY_TYPE_INVALID": "public key should be a Buffer",
    "EC_PUBLIC_KEY_LENGTH_INVALID": "public key length is invalid",
    "EC_PUBLIC_KEY_PARSE_FAIL": "the public key could not be parsed or is invalid",
    "EC_PUBLIC_KEY_CREATE_FAIL": "private was invalid, try again",
    "EC_PUBLIC_KEY_TWEAK_ADD_FAIL": "tweak out of range or resulting public key is invalid",
    "EC_PUBLIC_KEY_TWEAK_MUL_FAIL": "tweak out of range",
    "EC_PUBLIC_KEY_COMBINE_FAIL": "the sum of the public keys is not valid",
    "ECDH_FAIL": "scalar was invalid (zero or overflow)",
    "ECDSA_SIGNATURE_TYPE_INVALID": "signature should be a Buffer",
    "ECDSA_SIGNATURE_LENGTH_INVALID": "signature length is invalid",
    "ECDSA_SIGNATURE_PARSE_FAIL": "couldn't parse signature",
    "ECDSA_SIGNATURE_PARSE_DER_FAIL": "couldn't parse DER signature",
    "ECDSA_SIGNATURE_SERIALIZE_DER_FAIL": "couldn't serialize signature to DER format",
    "ECDSA_SIGN_FAIL": "nonce generation function failed or private key is invalid",
    "ECDSA_RECOVER_FAIL": "couldn't recover public key from signature",
    "MSG32_TYPE_INVALID": "message should be a Buffer",
    "MSG32_LENGTH_INVALID": "message length is invalid",
    "OPTIONS_TYPE_INVALID": "options should be an Object",
    "OPTIONS_DATA_TYPE_INVALID": "options.data should be a Buffer",
    "OPTIONS_DATA_LENGTH_INVALID": "options.data length is invalid",
    "OPTIONS_NONCEFN_TYPE_INVALID": "options.noncefn should be a Function",
    "RECOVERY_ID_TYPE_INVALID": "recovery should be a Number",
    "RECOVERY_ID_VALUE_INVALID": "recovery should have value between -1 and 4",
    "TWEAK_TYPE_INVALID": "tweak should be a Buffer",
    "TWEAK_LENGTH_INVALID": "tweak length is invalid"
};

export type CurveType = 'p256' | 'secp256k1'; // Note: add more types here if needed

class Curve {
    private ec: elliptic.ec;
    private ecparams: any;

    constructor(curveType: CurveType) {
        this.ec = new elliptic.ec(curveType);
        this.ecparams = this.ec.curve;
    }

    loadPublicKey(publicKey: Buffer) {
        return this.ec.keyFromPublic(publicKey);
    }

    privateKeyVerify(privateKey: Buffer) {
        const bn = new BN(privateKey);
        return bn.cmp(this.ecparams.n) < 0 && !bn.isZero();
    }

    privateKeyExport(privateKey: Buffer, compressed: boolean) {
        const d = new BN(privateKey);
        if (d.cmp(this.ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PRIVATE_KEY_EXPORT_DER_FAIL);

        return Buffer.from(this.ec.keyFromPrivate(privateKey).getPublic(compressed, 'true' as any));
    }

    privateKeyNegate(privateKey: Buffer) {
        const bn = new BN(privateKey);
        return bn.isZero()
            ? Buffer.alloc(32)
            : this.ecparams.n
                .sub(bn)
                .umod(this.ecparams.n)
                .toArrayLike(Buffer, 'be', 32);
    }

    privateKeyModInverse(privateKey: Buffer) {
        const bn = new BN(privateKey);
        if (bn.cmp(this.ecparams.n) >= 0 || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_RANGE_INVALID);

        return bn.invm(this.ecparams.n).toArrayLike(Buffer, 'be', 32);
    }

    privateKeyTweakAdd(privateKey: Buffer, tweak: Buffer) {
        const bn = new BN(tweak);
        if (bn.cmp(this.ecparams.n) >= 0) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);

        bn.iadd(new BN(privateKey));
        if (bn.cmp(this.ecparams.n) >= 0) bn.isub(this.ecparams.n);
        if (bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);

        return bn.toArrayLike(Buffer, 'be', 32);
    }

    privateKeyTweakMul(privateKey: Buffer, tweak: Buffer) {
        let bn = new BN(tweak);
        if (bn.cmp(this.ecparams.n) >= 0 || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL);

        bn.imul(new BN(privateKey));
        if (bn.cmp(this.ecparams.n)) bn = bn.umod(this.ecparams.n);

        return bn.toArrayLike(Buffer, 'be', 32);
    }

    publicKeyCreate(privateKey: Buffer, compressed: boolean) {
        const d = new BN(privateKey);
        if (d.cmp(this.ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PUBLIC_KEY_CREATE_FAIL);

        return Buffer.from(this.ec.keyFromPrivate(privateKey).getPublic(compressed, 'true' as any));
    }

    publicKeyConvert(publicKey: Buffer, compressed: boolean) {
        const pair = this.loadPublicKey(publicKey);
        if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

        return Buffer.from(pair.getPublic(compressed, 'true' as any));
    }

    publicKeyVerify(publicKey: Buffer) {
        return this.loadPublicKey(publicKey) !== null;
    }

    publicKeyTweakAdd(publicKey: Buffer, tweak: Buffer | BN, compressed: boolean) {
        const pair = this.loadPublicKey(publicKey);
        if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

        tweak = new BN(tweak);
        if (tweak.cmp(this.ecparams.n) >= 0) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_ADD_FAIL);

        return Buffer.from(
            this.ecparams.g
                .mul(tweak)
                .add(pair.getPublic())
                .encode(true, compressed)
        );
    }

    publicKeyTweakMul(publicKey: Buffer, tweak: Buffer | BN, compressed: boolean) {
        const pair = this.loadPublicKey(publicKey);
        if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

        tweak = new BN(tweak);
        if (tweak.cmp(this.ecparams.n) >= 0 || tweak.isZero()) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL);

        return Buffer.from(
            pair
                .getPublic()
                .mul(tweak)
                .encode(true as any, compressed)
        );
    }

    publicKeyCombine(publicKeys: Buffer[], compressed: boolean) {
        const pairs = new Array(publicKeys.length);
        for (let i = 0; i < publicKeys.length; ++i) {
            pairs[i] = this.loadPublicKey(publicKeys[i]);
            if (pairs[i] === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);
        }

        let point = pairs[0].pub;
        for (let j = 1; j < pairs.length; ++j) point = point.add(pairs[j].pub);
        if (point.isInfinity()) throw new Error(messages.EC_PUBLIC_KEY_COMBINE_FAIL);

        return Buffer.from(point.encode(true, compressed));
    }

    signatureNormalize(signature: Buffer) {
        const r = new BN(signature.slice(0, 32));
        const s = new BN(signature.slice(32, 64));
        if (r.cmp(this.ecparams.n) >= 0 || s.cmp(this.ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

        const result = Buffer.from(signature);
        if (s.cmp(this.ec.nh) === 1)
            this.ecparams.n
                .sub(s)
                .toArrayLike(Buffer, 'be', 32)
                .copy(result, 32);

        return result;
    }

    signatureExport(signature: Buffer) {
        const r = signature.slice(0, 32);
        const s = signature.slice(32, 64);
        if (new BN(r).cmp(this.ecparams.n) >= 0 || new BN(s).cmp(this.ecparams.n) >= 0)
            throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

        return { r: r, s: s };
    }

    signatureImport(sigObj: any) {
        let r = new BN(sigObj.r);
        if (r.cmp(this.ecparams.n) >= 0) r = new BN(0);

        let s = new BN(sigObj.s);
        if (s.cmp(this.ecparams.n) >= 0) s = new BN(0);

        return Buffer.concat([r.toArrayLike(Buffer, 'be', 32), s.toArrayLike(Buffer, 'be', 32)]);
    }

    sign(message: Buffer, privateKey: Buffer, noncefn?: any, data?: any) {
        if (typeof noncefn === 'function') {
            const getNonce = noncefn;
            noncefn = function (counter: any) {
                const nonce = getNonce(message, privateKey, null, data, counter);
                if (!Buffer.isBuffer(nonce) || nonce.length !== 32) throw new Error(messages.ECDSA_SIGN_FAIL);

                return new BN(nonce);
            };
        }

        const d = new BN(privateKey);
        if (d.cmp(this.ecparams.n) >= 0 || d.isZero()) throw new Error(messages.ECDSA_SIGN_FAIL);

        const result = this.ec.sign(message, privateKey, { canonical: true, k: noncefn, pers: data });
        return {
            signature: Buffer.concat([result.r.toArrayLike(Buffer, 'be', 32), result.s.toArrayLike(Buffer, 'be', 32)]),
            recovery: result.recoveryParam
        };
    }

    verify(message: Buffer, signature: Buffer, publicKey: Buffer) {
        if (message.length % 2 !== 0) {
            throw new Error('Wrong message length');
        }

        const sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) };

        const sigr = new BN(sigObj.r);
        const sigs = new BN(sigObj.s);
        if (sigr.cmp(this.ecparams.n) >= 0 || sigs.cmp(this.ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);
        if (sigs.cmp(this.ec.nh) === 1 || sigr.isZero() || sigs.isZero()) return false;

        const pair = this.loadPublicKey(publicKey);
        if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

        return this.ec.verify(message, sigObj as any, { x: pair.getPublic().getX(), y: pair.getPublic().getY() } as any);
    }

    recover(message: Buffer, signature: Buffer, recovery: number, compressed: boolean) {
        const sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) };

        const sigr = new BN(sigObj.r);
        const sigs = new BN(sigObj.s);
        if (sigr.cmp(this.ecparams.n) >= 0 || sigs.cmp(this.ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

        try {
            if (sigr.isZero() || sigs.isZero()) throw new Error();

            const point = this.ec.recoverPubKey(message, sigObj as any, recovery);
            return Buffer.from(point.encode(true, compressed));
        } catch (err) {
            throw new Error(messages.ECDSA_RECOVER_FAIL);
        }
    }

    ecdh(publicKey: Buffer, privateKey: Buffer) {
        const shared = exports.ecdhUnsafe(publicKey, privateKey, true);
        return createHash('sha256')
            .update(shared)
            .digest();
    }

    ecdhUnsafe(publicKey: Buffer, privateKey: Buffer, compressed: boolean) {
        const pair = this.loadPublicKey(publicKey);
        if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

        const scalar = new BN(privateKey);
        if (scalar.cmp(this.ecparams.n) >= 0 || scalar.isZero()) throw new Error(messages.ECDH_FAIL);

        return Buffer.from(
            pair
                .getPublic()
                .mul(scalar)
                .encode(true as any, compressed)
        );
    }
}

/**
 * Creates or return a cached curve instance for a given curve type.
 */
const curveInstances: {
    [curve: string]: Curve // CurveType -> Curve
} = {};
export const getCurve = (curveType: CurveType): Curve => {
    if (!(curveType in curveInstances))
        curveInstances[curveType] = new Curve(curveType);
    return curveInstances[curveType];
}
