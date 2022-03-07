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

import * as assert from 'assert'; // TODO: stop using this nodejs lib to save space
import { mnemonicToSeedSync } from "bip39";
import * as bs58check from 'bs58';
import createHash from 'create-hash';
import createHmac from 'create-hmac';
import { Base58 } from './crypto/base58';
// import * as crypto from 'crypto';
import { CurveType, getCurve } from './crypto/curve';
import { SHA256 } from "./crypto/sha256";

const MASTER_SECRET = Buffer.from('Bitcoin seed', 'utf8');
const COMPRESSED_PUBLIC_KEY_LENGTH_BYTES = 33;

export interface Version {
    private: number;
    public: number;
}

// Note: can use package `coininfo` for others
export const ELASTOS_MAINCHAIN_VERSIONS: Version = { private: 0x0488ade4, public: 0x0488b21e };
export const BITCOIN_VERSIONS: Version = { private: 0x0488ade4, public: 0x0488b21e };

export interface HDKeyJSON {
    xpriv: string;
    xpub: string;
}

enum AddressType {
    Bitcoin, // TODO: what kind of "bitcoin" address...?
    ElastosMainChain,
    ElastosIdentityChain
}

enum AddressPrefix {
    // Bitcoin
    Bitcoin = 0x00,

    // Elastos
    ElastosStandard = 0x21,
    //PrefixMultiSign  = 0x12,
    //PrefixCrossChain = 0x4B,
    //PrefixCRExpenses = 0x1C,
    //PrefixDeposit    = 0x1F,
    ElastosIDChain = 0x67,
    //PrefixDestroy    = 0,
}

enum AddressRedeemSuffix {
    // Elastos
    ElastosStandard = 0xAC,
    ElastosIDChain = 0xAD,
    ElastosMainChainMultiSig = 0xAE
}

/**
 * Class that can conveniently operates mnemonics (bip39), key derivations (bip32),
 * signatures, using multiple kind of curve algorithms (not only secp256k1 as in most bitcoin libraries).
 */
export class HDKey {
    public static PUBLICKEY_BYTES = 33;
    public static PRIVATEKEY_BYTES = 32;
    public static SEED_BYTES = 64;
    public static EXTENDED_KEY_BYTES = 82;
    public static EXTENDED_PRIVATEKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
    public static EXTENDED_PUBLICKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
    private static PADDING_STANDARD = 0xAD;
    private static HARDENED_OFFSET = 0x80000000;

    private static bip32HeaderP2PKHpub = 0x0488b21e; // The 4 byte header that serializes in base58 to "xpub".
    private static bip32HeaderP2PKHpriv = 0x0488ade4; // The 4 byte header that serializes in base58 to "xprv"
    private static bip32HeaderP2WPKHpub = 0x04b24746; // The 4 byte header that serializes in base58 to "zpub".
    private static bip32HeaderP2WPKHpriv = 0x04b2430c; // The 4 byte header that serializes in base58 to "zprv"

    // Derive path: m/44'/0'/0'/0/index
    //public static DERIVE_PATH_PREFIX = "m/44'/0'/0'/0/" //"44H/0H/0H/0/";

    // Pre-derive publickey path: m/44'/0'/0'
    //public static PRE_DERIVED_PUBLICKEY_PATH = "m/44'/0'/0'" //"44H/0H/0H";

    versions: Version;
    depth: number;
    index: number;
    _privateKey: Buffer | null;
    _publicKey: Buffer | null;
    _identifier: Buffer;
    chainCode: any;
    _fingerprint: number;
    parentFingerprint: number;

    private constructor(private curve: CurveType, versions: Version) {
        this.versions = versions;
        this.depth = 0;
        this.index = 0;
        this._privateKey = null;
        this._publicKey = null;
        this.chainCode = null;
        this._fingerprint = 0;
        this.parentFingerprint = 0;
    }

    public static newWithMnemonic(mnemonic: string, passphrase: string, curve: CurveType, versions: Version): HDKey {
        let seed = mnemonicToSeedSync(mnemonic, passphrase)
        return HDKey.newWithSeed(seed, curve, versions);
    }

    public static newWithSeed(seedBuffer: Buffer, curve: CurveType, versions: Version): HDKey {
        const I = createHmac('sha512', MASTER_SECRET).update(seedBuffer).digest();

        const IL = I.slice(0, 32);
        const IR = I.slice(32);

        const hdkey = new HDKey(curve, versions);
        hdkey.chainCode = IR;
        hdkey.privateKey = IL;

        return hdkey;
    }

    public static newWithKey(key: HDKey): HDKey {
        let newHDKey = new HDKey(key.curve, key.versions);
        Object.assign(newHDKey, key);
        return newHDKey;
    }

    public getPrivateKeyBytes(): Buffer {
        return this.privateKey;
    }

    /**
     * Hex representation (user friendly) of the private key, without 0x prefix.
     */
    public getPrivateKeyString(): string {
        return this.getPrivateKeyBytes().toString("hex");
    }

    public getPrivateKeyBase58(): string {
        return Base58.encode(this.getPrivateKeyBytes());
    }

    public getPublicKeyBytes(): Buffer {
        return this.publicKey;
    }

    /**
    * Hex representation (user friendly) of the public key, without 0x prefix.
    */
    public getPublicKeyString(): string {
        return this.getPublicKeyBytes().toString("hex");
    }

    public getPublicKeyBase58(): string {
        return Base58.encode(this.getPublicKeyBytes());
    }

    public serializePrivateKey(): Buffer {
        return Base58.decode(this.serializePrivateKeyBase58());
    }

    /**
     * @returns "xprv----"
     */
    public serializePrivateKeyBase58(): string {
        let buffer = Base58.decode(this.privateExtendedKey);
        let base58Buffer = Buffer.alloc(82);
        buffer.copy(base58Buffer);
        let hash = SHA256.hashTwice(buffer);
        hash.copy(base58Buffer, 78, 0, 4);
        return Base58.encode(base58Buffer);
    }

    public serializePublicKey(): Buffer {
        return Base58.decode(this.serializePublicKeyBase58());
    }

    /**
     * @returns "xpub----"
     */
    public serializePublicKeyBase58(): string {
        let buffer = Base58.decode(this.publicExtendedKey);
        let base58Buffer = Buffer.alloc(82);
        buffer.copy(base58Buffer);
        let hash = SHA256.hashTwice(buffer);
        hash.copy(base58Buffer, 78, 0, 4);
        return Base58.encode(base58Buffer);
    }

    public deriveWithPath(path: string): HDKey {
        return HDKey.newWithKey(this.derive(path));
    }

    public deriveWithIndex(index: number, hardened = false): HDKey {
        if (hardened) index += HDKey.HARDENED_OFFSET;
        return HDKey.newWithKey(this.deriveChild(index));
    }

    public getBinElastosAddress(): Buffer {
        return HDKey.getBinAddressFromBuffer(this.getPublicKeyBytes(), AddressType.ElastosMainChain);
    }

    public getElastosAddress(): string {
        let binAddress = this.getBinElastosAddress();
        return Base58.encode(binAddress);
    }

    public getBinDID(): Buffer {
        return HDKey.getBinAddressFromBuffer(this.getPublicKeyBytes(), AddressType.ElastosIdentityChain);
    }

    public getDID(): string {
        let binAddress = this.getBinDID();
        return Base58.encode(binAddress);
    }

    // https://en.bitcoin.it/wiki/BIP_0032
    public static fromExtendedKey(base58key: string, curve: CurveType, versions: Version) {
        // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
        const hdkey = new HDKey(curve, versions);

        const keyBuffer = bs58check.decode(base58key);

        const version = keyBuffer.readUInt32BE(0);
        assert.ok(
            version === versions.private || version === versions.public,
            'Version mismatch: does not match private or public'
        );

        hdkey.depth = keyBuffer.readUInt8(4);
        hdkey.parentFingerprint = keyBuffer.readUInt32BE(5);
        hdkey.index = keyBuffer.readUInt32BE(9);
        hdkey.chainCode = keyBuffer.slice(13, 45);

        const key = keyBuffer.slice(45);
        if (key.readUInt8(0) === 0) {
            // private
            assert.ok(version === versions.private, 'Version mismatch: version does not match private');
            hdkey.privateKey = key.slice(1, 33); // cut off first 0x0 byte + remove the 4 bytes checksum in the end
        } else {
            assert.ok(version === versions.public, 'Version mismatch: version does not match public');
            hdkey.publicKey = key.slice(0, 33); // Remove the 4 bytes checksum in the end
        }

        return hdkey;
    }

    /* static fromJSON(obj: HDKeyJSON) {
        return HDKey.fromExtendedKey(obj.xpriv);
    } */

    private get fingerprint() {
        return this._fingerprint;
    }

    private get identifier() {
        return this._identifier;
    }

    private get pubKeyHash() {
        return this.identifier;
    }

    private get privateKey() {
        return this._privateKey;
    }

    private set privateKey(value: Buffer | null) {
        if (value === null) {
            throw new Error('Can not directly set privateKey to null.');
        }

        assert.equal(value.length, 32, 'Private key must be 32 bytes.');
        assert.ok(getCurve(this.curve).privateKeyVerify(value) === true, 'Invalid private key');

        this._privateKey = value;
        this._publicKey = getCurve(this.curve).publicKeyCreate(value, true);
        this._identifier = hash160(this.publicKey!);
        this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
    }

    private get publicKey() {
        return this._publicKey;
    }

    private set publicKey(value: Buffer | null) {
        if (value === null) {
            throw new Error('Can not directly set privateKey to null.');
        }

        assert.ok(value.length === 33 || value.length === 65, 'Public key must be 33 or 65 bytes.');
        assert.ok(getCurve(this.curve).publicKeyVerify(value) === true, 'Invalid public key');

        this._publicKey = getCurve(this.curve).publicKeyConvert(value, true); // force compressed point
        this._identifier = hash160(this.publicKey!);
        this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
        this._privateKey = null;
    }

    get privateExtendedKey() {
        if (this._privateKey)
            return bs58check.encode(
                this.serialize(this.versions.private, Buffer.concat([Buffer.alloc(1, 0), this.privateKey!]))
            );
        else return null;
    }

    get publicExtendedKey() {
        return bs58check.encode(this.serialize(this.versions.public, this.publicKey!));
    }

    private serialize(version: number, key: Buffer) {
        const LEN = 78;

        // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
        const buffer = Buffer.allocUnsafe(LEN);

        buffer.writeUInt32BE(version, 0);
        buffer.writeUInt8(this.depth, 4);

        const fingerprint = this.depth ? this.parentFingerprint : 0x00000000;
        buffer.writeUInt32BE(fingerprint, 5);
        buffer.writeUInt32BE(this.index, 9);

        this.chainCode.copy(buffer, 13);
        key.copy(buffer, 45);

        return buffer;
    }

    public derive(path: string): HDKey {
        if (path === 'm' || path === 'M' || path === "m'" || path === "M'") {
            return this;
        }

        const entries = path.split('/');
        let hdkey: HDKey = this;
        entries.forEach(function (c, i) {
            if (i === 0) {
                assert.ok(/^[mM]{1}/.test(c), 'Path must start with "m" or "M"');
                return;
            }

            const hardened = c.length > 1 && c[c.length - 1] === "'";
            let childIndex = parseInt(c, 10); // & (HARDENED_OFFSET - 1)
            assert.ok(childIndex < HDKey.HARDENED_OFFSET, 'Invalid index');
            if (hardened) {
                childIndex += HDKey.HARDENED_OFFSET;
            }

            hdkey = hdkey.deriveChild(childIndex);
        });

        return hdkey;
    }

    public deriveChild(index: number): HDKey {
        const isHardened = index >= HDKey.HARDENED_OFFSET;
        const indexBuffer = Buffer.allocUnsafe(4);
        indexBuffer.writeUInt32BE(index, 0);

        let data: Buffer;

        if (isHardened) {
            // Hardened child
            assert.ok(this.privateKey, 'Could not derive hardened child key');

            let pk = this.privateKey!;
            const zb = Buffer.alloc(1, 0);
            pk = Buffer.concat([zb, pk]);

            // data = 0x00 || ser256(kpar) || ser32(index)
            data = Buffer.concat([pk, indexBuffer]);
        } else {
            // Normal child
            // data = serP(point(kpar)) || ser32(index)
            //      = serP(Kpar) || ser32(index)
            data = Buffer.concat([this.publicKey!, indexBuffer]);
        }

        const I = createHmac('sha512', this.chainCode)
            .update(data)
            .digest();
        const IL = I.slice(0, 32);
        const IR = I.slice(32);

        const hd = new HDKey(this.curve, this.versions);

        // Private parent key -> private child key
        if (this.privateKey) {
            // ki = parse256(IL) + kpar (mod n)
            try {
                hd.privateKey = getCurve(this.curve).privateKeyTweakAdd(this.privateKey, IL);
                // throw if IL >= n || (privateKey + IL) === 0
            } catch (err) {
                // In case parse256(IL) >= n or ki == 0, one should proceed with the next value for i
                return this.deriveChild(index + 1);
            }
            // Public parent key -> public child key
        } else {
            // Ki = point(parse256(IL)) + Kpar
            //    = G*IL + Kpar
            try {
                hd.publicKey = getCurve(this.curve).publicKeyTweakAdd(this.publicKey!, IL, true);
                // throw if IL >= n || (g**IL + publicKey) is infinity
            } catch (err) {
                // In case parse256(IL) >= n or Ki is the point at infinity, one should proceed with the next value for i
                return this.deriveChild(index + 1);
            }
        }

        hd.chainCode = IR;
        hd.depth = this.depth + 1;
        hd.parentFingerprint = this.fingerprint; // .readUInt32BE(0)
        hd.index = index;

        return hd;
    }

    public sign(hash: Buffer) {
        return getCurve(this.curve).sign(hash, this.privateKey!).signature;
    }

    public verify(hash: Buffer, signature: Buffer) {
        return getCurve(this.curve).verify(hash, signature, this.publicKey!);
    }

    public toJSON(): HDKeyJSON {
        return {
            xpriv: this.privateExtendedKey,
            xpub: this.publicExtendedKey
        };
    }

    /* public static deserialize(keyData: Buffer): HDKey {
        return this.deserializeBase58(Base58.encode(keyData));
    }

    public static deserializeBase58(keyData: string): HDKey {
        return HDKey.newWithKey(HDKey.fromExtendedKey(keyData));
    } */

    private static transformBip32HeaderToBuffer(bip32HeaderValue: number): Buffer {
        let buffer = Buffer.alloc(4);
        buffer[0] = ((bip32HeaderValue >> 24) & 0xFF);
        buffer[1] = ((bip32HeaderValue >> 16) & 0xFF);
        buffer[2] = ((bip32HeaderValue >> 8) & 0xFF);
        buffer[3] = (bip32HeaderValue & 0xFF);
        return buffer;
    }

    public static paddingToExtendedPrivateKey(pk: Buffer): Buffer {

        let extendedPrivateKeyBytes = Buffer.alloc(HDKey.EXTENDED_PRIVATEKEY_BYTES);
        let bip32Header = HDKey.transformBip32HeaderToBuffer(this.bip32HeaderP2PKHpriv);
        bip32Header.copy(extendedPrivateKeyBytes);

        pk.copy(extendedPrivateKeyBytes, 46, 0, 32);

        let buftoHash = Buffer.alloc(78);
        extendedPrivateKeyBytes.copy(buftoHash, 0, 0, 78);
        let hash = SHA256.hashTwice(buftoHash);
        hash.copy(extendedPrivateKeyBytes, 78, 0, 4);

        return extendedPrivateKeyBytes;
    }

    public static paddingToExtendedPublicKey(pk: Buffer): Buffer {
        let extendedPublicKeyBytes = Buffer.alloc(HDKey.EXTENDED_PUBLICKEY_BYTES);
        let bip32Header = HDKey.transformBip32HeaderToBuffer(this.bip32HeaderP2PKHpub);
        bip32Header.copy(extendedPublicKeyBytes);

        pk.copy(extendedPublicKeyBytes, 45, 0, 33);

        let buftoHash = Buffer.alloc(78);
        extendedPublicKeyBytes.copy(buftoHash, 0, 0, 78);
        let hash = SHA256.hashTwice(buftoHash);
        hash.copy(extendedPublicKeyBytes, 78, 0, 4);

        return extendedPublicKeyBytes;
    }

    private static getRedeemScript(publicKey: Buffer, addressType: AddressType): Buffer {
        // Bitcoin redeem script == public key
        if (addressType === AddressType.Bitcoin)
            return publicKey;

        // Elastos main chain/identity chain redeem script = len + pk + ac/ad ...
        let suffix;
        switch (addressType) {
            case AddressType.ElastosMainChain:
                suffix = AddressRedeemSuffix.ElastosStandard; break;
            case AddressType.ElastosIdentityChain:
                suffix = AddressRedeemSuffix.ElastosIDChain; break;
            default:
                throw Error("getRedeemScript(): Unsupported address type " + addressType);
        }

        let script = Buffer.alloc(1 + COMPRESSED_PUBLIC_KEY_LENGTH_BYTES + 1);
        script[0] = COMPRESSED_PUBLIC_KEY_LENGTH_BYTES; // A public key is 33 bytes
        publicKey.copy(script, 1);
        script[COMPRESSED_PUBLIC_KEY_LENGTH_BYTES + 1] = suffix;
        return script;
    }

    /**
     * Elastos mainchain redeem script =
     *  m + public keys + len(keys) + 0xae (suffix)
     *
     * Where:
     *  m = number of signatures required
     *  public keys are concatenated
     *
     * TODO: try to make this more generic - for now, first attempt, ela mainchain only
     */
    private static getElastosMainChainMultiSigRedeemScript(requiredSignatures: number, publicKeys: Buffer[]): Buffer {
        let script: Buffer;

        // m - number of required signatures
        script = Buffer.concat([Buffer.alloc(1, requiredSignatures)]);

        // Concatenate all public keys
        for (let keyIndex = 0; keyIndex < publicKeys.length; keyIndex++) {
            script = Buffer.concat([script, publicKeys[keyIndex]]);
        }

        // Total number of cosigners
        script = Buffer.concat([script, Buffer.alloc(1, publicKeys.length)]);

        // Multisig suffix
        script = Buffer.concat([script, Buffer.alloc(1, AddressRedeemSuffix.ElastosMainChainMultiSig)]);

        return script;
    }

    /**
     * @param derivedPublicKeys m/45'/cosignerIndex/change/addressIndex cosigners derived public keys
     */
    public static getElastosMainChainMultiSigAddress(requiredSignatures: number, derivedPublicKeys: Buffer[]): string {
        // Convert the redeemScript to program hash
        let script = this.getElastosMainChainMultiSigRedeemScript(requiredSignatures, derivedPublicKeys);
        let hash = SHA256.sha256ripemd160(script);

        /*  TODO sum:= Uint168{ }
          copy(sum[:], md160.Sum([]byte{ prefix }))
  
          // Convert program hash to address
          data:= u.Bytes()
          checksum:= Sha256D(data)
          data = append(data, checksum[0: 4]...) */
        let binAddress = "";


        /*  let programHash = Buffer.alloc(hash.length + 1);
 
         let padding = AddressRedeemSuffix.ElastosMainChainMultiSig;
         programHash[0] = padding;
         hash.copy(programHash, 1);
 
         hash = SHA256.hashTwice(programHash);
         let binAddress = Buffer.alloc(programHash.length + 4);
         programHash.copy(binAddress, 0);
         hash.copy(binAddress, programHash.length, 0, 4); */

        return binAddress;
    }

    /**
     * @param padding 0x21 for elastos mainchain, 0x67 for elastos ID chain, etc
     */
    private static getBinAddressFromBuffer(pk: Buffer, addressType: AddressType): Buffer {
        let script = this.getRedeemScript(pk, addressType);

        let hash = SHA256.sha256ripemd160(script);
        let programHash = Buffer.alloc(hash.length + 1);

        let padding: number;
        switch (addressType) {
            case AddressType.Bitcoin:
                padding = 0x0; break;
            case AddressType.ElastosMainChain:
                padding = AddressPrefix.ElastosStandard; break;
            case AddressType.ElastosIdentityChain:
                padding = AddressPrefix.ElastosIDChain; break;
            default:
                throw Error("Unsupported address type " + addressType);
        }
        programHash[0] = padding;
        hash.copy(programHash, 1);

        hash = SHA256.hashTwice(programHash);
        let binAddress = Buffer.alloc(programHash.length + 4);
        programHash.copy(binAddress, 0);
        hash.copy(binAddress, programHash.length, 0, 4);

        return binAddress;
    }

    public static toDID(pk: Buffer): string {
        return Base58.encode(this.getBinAddressFromBuffer(pk, AddressType.ElastosIdentityChain));
    }

    // Expected format: iiqiamYkNpYjQFNqYaiTvdGushk68wWeC6
    public static isDIDValid(address: string): boolean {
        let binAddress = Base58.decode(address);

        if (binAddress.length != 25)
            return false;

        if (binAddress[0] != AddressType.ElastosIdentityChain)
            return false;

        // Hash twice
        let hash = SHA256.hashTwice(Buffer.from(binAddress.toString("hex").substr(0, 21)));

        return (hash[0] == binAddress[21] && hash[1] == binAddress[22]
            && hash[2] == binAddress[23] && hash[3] == binAddress[24]);
    }


    public wipe() {
        // TODO
    }
}

function hash160(buf: Buffer) {
    const sha = createHash('sha256')
        .update(buf)
        .digest();
    return createHash('rmd160')
        .update(sha)
        .digest();
}