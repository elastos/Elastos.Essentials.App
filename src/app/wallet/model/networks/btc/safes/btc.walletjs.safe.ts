import * as BTC from 'bitcoinjs-lib';
import { Payment } from 'bitcoinjs-lib';
import { bitcoin, testnet } from "bitcoinjs-lib/src/networks";
import { tapTweakHash, tweakKey } from 'bitcoinjs-lib/src/payments/bip341';
import { isTaprootInput, toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { isP2TR } from 'bitcoinjs-lib/src/psbt/psbtutils';
import { Logger } from "src/app/logger";
import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { BTCOutputData, BTCSignDataType, BTCSignPsbtOptions, BTCTxData, BTCUTXO, BTC_MAINNET_PATHS, BitcoinAddressType, UtxoDust } from "../../../btc.types";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from '../../../safes/safe.types';
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from '../../base/subwallets/subwallet';
import { BTCSafe } from "./btc.safe";
import bitcoinMessage from "bitcoinjs-message";


type AccountInfo = {
  address: string;
  publicKey: string;
};

type BtcAccountInfos = {
  [addressType: string]: AccountInfo // "legacy":  {"address":"xxx", "publicKey": "xxx"}
};

const SupportedBtcAddressTypes = [BitcoinAddressType.Legacy,
                                  BitcoinAddressType.NativeSegwit,
                                  // BitcoinAddressType.P2sh,
                                  BitcoinAddressType.Taproot]

export class BTCWalletJSSafe extends Safe implements BTCSafe {
    private btcAddress = null;
    private btcPublicKey = null;
    private btcNetwork = bitcoin;

    constructor(protected masterWallet: StandardMasterWallet, protected chainId: string, protected bitcoinAddressType = BitcoinAddressType.NativeSegwit) {
        super(masterWallet);
    }

    public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
        await super.initialize(networkWallet);

        if (networkWallet.network.networkTemplate === TESTNET_TEMPLATE) {
            this.btcNetwork = testnet;
        }

        // Check if the address is already computed or not  (first time). If not, request the
        // master password to compute it
        let accounts = await networkWallet.loadContextInfo("btcAccounts");
        if (accounts && accounts[this.bitcoinAddressType]) {
            this.btcAddress = accounts[this.bitcoinAddressType].address;
            this.btcPublicKey = accounts[this.bitcoinAddressType].publicKey;
        } else {
            accounts = await this.initJSWallet()
            if (accounts && accounts[this.bitcoinAddressType]) {
                this.btcAddress = accounts[this.bitcoinAddressType].address;
                this.btcPublicKey = accounts[this.bitcoinAddressType].publicKey;
                await networkWallet.saveContextInfo("btcAccounts", accounts);
            }
        }
    }

    private async initJSWallet(): Promise<BtcAccountInfos> {
        try {
            let accountInfos: BtcAccountInfos = {};
            const root = await this.getRoot();

            for (let i = 0; i < SupportedBtcAddressTypes.length; i++) {
                let derivePath = this.getDerivePath(SupportedBtcAddressTypes[i]);
                const keypair = root.derivePath(derivePath)
                let btcAddress = await this.getAddress(keypair, SupportedBtcAddressTypes[i]);
                let btcPublicKey = keypair.publicKey.toString('hex');
                accountInfos[SupportedBtcAddressTypes[i]] = {
                    address: btcAddress,
                    publicKey: btcPublicKey
                }
            }

            return accountInfos;
        } catch (e) {
            Logger.warn('wallet', 'initJSWallet exception:', e)
        }
    }

    private getDerivePath(addressType) {
        return BTC_MAINNET_PATHS[addressType];
    }

    private async getRoot(forceShowMasterPrompt = false) {
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, forceShowMasterPrompt);
        if (!payPassword)
            return;

        try {
            // tiny-secp256k1 v2 is an ESM module, so we can't "require", and must import async
            const ecc = await import('tiny-secp256k1');
            const { BIP32Factory } = await import('bip32');
            const bip32 = BIP32Factory(ecc);

            // For taproot
            BTC.initEccLib(ecc)

            // create wallet from seed
            let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
            if (seed) {
                Logger.log('wallet', 'BTC Safe: Using seed for wallet initialization');
                return bip32.fromSeed(Buffer.from(seed, "hex"), this.btcNetwork);
            }

            /* If necessary, can use this code to create btc wallet by evm privatekey */
/*
            // create wallet from private key
            Logger.log('wallet', 'BTC Safe: Using private key for wallet initialization');
            let privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
            if (privateKey) {
                // remove 0x prefix
                privateKey = privateKey.replace(/^0x/, '');
                const privateKeyBuffer = Buffer.from(privateKey, 'hex');
                // create a fixed BIP32 node
                const chainCode = BTC.crypto.hash256(Buffer.concat([privateKeyBuffer, Buffer.from('BTC_PRIVATE_KEY_IMPORT', 'utf8')])).slice(0, 32);
                const bip32Node = bip32.fromPrivateKey(privateKeyBuffer, chainCode, this.btcNetwork);
                // rewrite derivePath method, always return itself (because this is the final key, no need to derive)
                const originalDerivePath = bip32Node.derivePath.bind(bip32Node);
                (bip32Node as any).derivePath = function(path: string) {
                    // if the path is empty or the root path, return itself
                    if (!path || path === 'm' || path === "m'") {
                        return bip32Node;
                    }
                    // for any derived path, return itself (because the private key is the final key)
                    // note: this will cause all address types to use the same private key, but they will generate different addresses (because the address format is different)
                    return bip32Node;
                };
                return bip32Node;
            }
*/
            Logger.warn('wallet', 'BTC Safe: No seed or valid private key found');
            return null;
        } catch (e) {
            Logger.warn('wallet', 'getRoot exception:', e)
        }
    }

    private async getKeyPair(forceShowMasterPrompt = false) {
        try {
            const root = await this.getRoot(forceShowMasterPrompt)
            if (root) {
              // if there is a seed, use the standard derive path
              // if the wallet is created from a private key, derivePath has been rewritten to return itself
              let derivePath = this.getDerivePath(this.bitcoinAddressType);
              const keyPair = root.derivePath(derivePath)
              return keyPair;
            }
        } catch (e) {
            Logger.warn('wallet', 'getKeyPair exception:', e)
        }
    }

    private getAddress(keyPair, addressType) {
        let payment: Payment = null;
        switch (addressType) {
            case BitcoinAddressType.Legacy:
                payment = BTC.payments.p2pkh({ pubkey: keyPair.publicKey , network: this.btcNetwork});
            break;
            case BitcoinAddressType.NativeSegwit:
                payment = BTC.payments.p2wpkh({pubkey: keyPair.publicKey, network: this.btcNetwork});
            break;
            case BitcoinAddressType.P2sh:
                payment = BTC.payments.p2sh({
                    redeem: BTC.payments.p2wpkh({pubkey: keyPair.publicKey, network: this.btcNetwork}),
                })
            break;
            case BitcoinAddressType.Taproot:
                payment = BTC.payments.p2tr({internalPubkey: toXOnly(keyPair.publicKey), network: this.btcNetwork})
            break;
        }
        return payment?.address;
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
        return [this.btcAddress];
    }

    public getPublicKey(): string {
        return this.btcPublicKey;
    }

    public async signDigest(address: string, digest: string, password: string): Promise<string> {
      let keypair = await this.getKeyPair(true);
      if (!keypair) {
          // User canceled the password
          return null;
      }


      // same as keypair.sign
      //   const secp256k1 = await import('secp256k1');
      //   let signObj = secp256k1.sign(Buffer.from(digest, "hex"), keypair.privateKey);
      //   if (signObj) {
      //      return signObj.signature.toString('hex');
      //   }
      //   else return null;

      // ecdsa
      return BTC.script.signature.encode(keypair.sign(Buffer.from(digest, 'hex')), BTC.Transaction.SIGHASH_ALL).toString('hex');
    }

    public async signData(digest: string, type: BTCSignDataType): Promise<string> {
        let keypair = await this.getKeyPair(true);
        if (!keypair) {
            // User canceled the password
            return null;
        }

        if (type === "ecdsa") {
            return keypair.sign(Buffer.from(digest, 'hex')).toString('hex');
        } else if (type === "schnorr") {
            return keypair.signSchnorr(Buffer.from(digest, 'hex')).toString('hex');
        } else {
            throw new Error("Not support type");
        }
    }

    private getOutputScriptForAddressType(pubkey: Buffer, addressType: BitcoinAddressType): Buffer | null {
        let payment: Payment = null;
        switch (addressType) {
            case BitcoinAddressType.Legacy:
                payment = BTC.payments.p2pkh({ pubkey, network: this.btcNetwork });
                break;
            case BitcoinAddressType.NativeSegwit:
                payment = BTC.payments.p2wpkh({ pubkey, network: this.btcNetwork });
                break;
            case BitcoinAddressType.P2sh:
                payment = BTC.payments.p2sh({
                    redeem: BTC.payments.p2wpkh({ pubkey, network: this.btcNetwork })
                });
                break;
            case BitcoinAddressType.Taproot:
                payment = BTC.payments.p2tr({ internalPubkey: toXOnly(pubkey), network: this.btcNetwork });
                break;
            default:
                return null;
        }
        return payment?.output || null;
    }

    private getOutputScriptForCurrentAddressType(pubkey: Buffer): Buffer | null {
        return this.getOutputScriptForAddressType(pubkey, this.bitcoinAddressType);
    }

    private psbtInputAddressAndValue(psbt: BTC.Psbt, inputIndex: number, network: BTC.Network): { address: string; sats: number } {
        const input = psbt.data.inputs[inputIndex];
        if (input.witnessUtxo) {
            let address = '(unknown)';
            try {
                address = BTC.address.fromOutputScript(input.witnessUtxo.script, network);
            } catch {
                /* non-standard script */
            }
            return { address, sats: Number(input.witnessUtxo.value) };
        }
        if (input.nonWitnessUtxo && psbt.txInputs[inputIndex]) {
            const prevTx = BTC.Transaction.fromBuffer(input.nonWitnessUtxo);
            const prevOutIndex = psbt.txInputs[inputIndex].index;
            const out = prevTx.outs[prevOutIndex];
            if (!out) {
                return { address: '(unknown)', sats: 0 };
            }
            let address = '(unknown)';
            try {
                address = BTC.address.fromOutputScript(out.script, network);
            } catch {
                /* non-standard */
            }
            return { address, sats: out.value };
        }
        return { address: '(unknown)', sats: 0 };
    }

    /** True if this input spends a prevout whose script equals our standard payment output script. */
    private psbtInputPrevoutScriptEquals(psbt: BTC.Psbt, inputIndex: number, ourScript: Buffer): boolean {
        const input = psbt.data.inputs[inputIndex];
        if (input.witnessUtxo?.script && ourScript && input.witnessUtxo.script.equals(ourScript)) {
            return true;
        }
        if (input.nonWitnessUtxo && psbt.txInputs[inputIndex]) {
            const prevTx = BTC.Transaction.fromBuffer(input.nonWitnessUtxo);
            const prevOutIndex = psbt.txInputs[inputIndex].index;
            const outScript = prevTx.outs[prevOutIndex]?.script;
            return !!(ourScript && outScript && outScript.equals(ourScript));
        }
        return false;
    }

    private buildOwnedAddressSet(accounts: BtcAccountInfos | null): Set<string> {
        const s = new Set<string>();
        if (this.btcAddress) s.add(this.btcAddress.toLowerCase());
        if (accounts) {
            for (const t of SupportedBtcAddressTypes) {
                const a = accounts[t]?.address;
                if (a) s.add(a.toLowerCase());
            }
        }
        return s;
    }

    private buildOwnedPubkeySet(accounts: BtcAccountInfos | null): Set<string> {
        const s = new Set<string>();
        const addPk = (hex: string) => {
            const h = hex.replace(/^0x/i, '').toLowerCase();
            if (!h) return;
            s.add(h);
            if (h.length === 66) s.add(h.slice(2));
        };
        if (this.btcPublicKey) addPk(this.btcPublicKey);
        if (accounts) {
            for (const t of SupportedBtcAddressTypes) {
                if (accounts[t]?.publicKey) addPk(accounts[t].publicKey);
            }
        }
        return s;
    }

    private collectPsbtInputIndexesToSign(
        psbt: BTC.Psbt,
        options: BTCSignPsbtOptions | undefined,
        accounts: BtcAccountInfos | null,
        root: any
    ): number[] {
        const n = psbt.data.inputs.length;
        const ownedAddrs = this.buildOwnedAddressSet(accounts);
        const ownedPubkeys = this.buildOwnedPubkeySet(accounts);

        if (options?.toSignInputs?.length) {
            const picked: number[] = [];
            for (const spec of options.toSignInputs) {
                const idx = Number(spec.index);
                if (Number.isNaN(idx) || idx < 0 || idx >= n) {
                    continue;
                }
                if (spec.address && !ownedAddrs.has(spec.address.toLowerCase())) {
                    continue;
                }
                if (spec.publicKey) {
                    const pk = spec.publicKey.replace(/^0x/i, '').toLowerCase();
                    if (!ownedPubkeys.has(pk)) {
                        continue;
                    }
                }
                picked.push(idx);
            }
            return [...new Set(picked)].sort((a, b) => a - b);
        }

        const ours: number[] = [];
        for (let i = 0; i < n; i++) {
            const { address } = this.psbtInputAddressAndValue(psbt, i, this.btcNetwork);
            if (address !== '(unknown)' && ownedAddrs.has(address.toLowerCase())) {
                ours.push(i);
            }
        }
        if (ours.length > 0) {
            return [...new Set(ours)].sort((a, b) => a - b);
        }
        // Address match failed (e.g. btcAccounts missing a type). Match prevout script against every
        // supported derivation so Taproot funding inputs still sign when the active UI type is Segwit.
        for (let i = 0; i < n; i++) {
            for (const addrType of SupportedBtcAddressTypes) {
                const pathKey = root.derivePath(this.getDerivePath(addrType));
                const ourScript = this.getOutputScriptForAddressType(pathKey.publicKey, addrType);
                if (ourScript && this.psbtInputPrevoutScriptEquals(psbt, i, ourScript)) {
                    ours.push(i);
                    break;
                }
            }
        }
        return [...new Set(ours)].sort((a, b) => a - b);
    }

    private resolveAddressTypeForInput(psbt: BTC.Psbt, index: number, accounts: BtcAccountInfos | null): BitcoinAddressType | null {
        const { address } = this.psbtInputAddressAndValue(psbt, index, this.btcNetwork);
        if (address === '(unknown)') {
            return null;
        }
        const lower = address.toLowerCase();
        if (accounts) {
            for (const t of SupportedBtcAddressTypes) {
                if (accounts[t]?.address && accounts[t].address.toLowerCase() === lower) {
                    return t as BitcoinAddressType;
                }
            }
        }
        if (this.btcAddress && this.btcAddress.toLowerCase() === lower) {
            return this.bitcoinAddressType;
        }
        return null;
    }

    /**
     * Partially (or fully) signs a PSBT using keys for this wallet's active Bitcoin address type.
     * Options follow UniSat `signPsbt` (autoFinalized, toSignInputs, per-input sighash / tweak flags).
     */
    public async signPsbt(psbtHex: string, options?: BTCSignPsbtOptions): Promise<string> {
        const root = await this.getRoot(true);
        if (!root) {
            return null;
        }

        const accounts =
            this.networkWallet ? ((await this.networkWallet.loadContextInfo('btcAccounts')) as BtcAccountInfos) : null;

        const psbt = BTC.Psbt.fromHex(psbtHex.replace(/^0x/i, ''), { network: this.btcNetwork });
        const autoFinalized = options?.autoFinalized !== false;
        const indexes = this.collectPsbtInputIndexesToSign(psbt, options, accounts, root);

        for (const idx of indexes) {
            let input = psbt.data.inputs[idx];
            const addrType = this.resolveAddressTypeForInput(psbt, idx, accounts);
            if (addrType === null) {
                throw new Error(
                    `Cannot determine Bitcoin key type for PSBT input #${idx} (address unknown or not in this wallet).`
                );
            }

            const pathKey = root.derivePath(this.getDerivePath(addrType));
            const spec = options?.toSignInputs?.find(t => t.index === idx);
            let signer: BTC.Signer = pathKey;

            if (isTaprootInput(input)) {
                const xOnlyInternal = toXOnly(pathKey.publicKey);
                const wScript = input.witnessUtxo?.script;
                let outputKeyXOnly: Buffer | null = null;
                if (wScript && isP2TR(wScript)) {
                    outputKeyXOnly = wScript.subarray(2, 34);
                }
                const mr = (input as { tapMerkleRoot?: Buffer }).tapMerkleRoot;
                const merkleRoot =
                    mr && Buffer.isBuffer(mr) && mr.length === 32 ? mr : undefined;

                // Many dApps (e.g. PSBT from Tx + witnessUtxo only) omit tapInternalKey. bitcoinjs-lib then
                // never enters the key-path signing branch. Inject fields when this wallet's key matches the UTXO.
                if (!input.tapInternalKey && outputKeyXOnly) {
                    const tw = tweakKey(xOnlyInternal, merkleRoot);
                    if (tw && tw.x.equals(outputKeyXOnly)) {
                        const tapUpdate: { tapInternalKey: Buffer; tapMerkleRoot?: Buffer } = {
                            tapInternalKey: xOnlyInternal
                        };
                        if (merkleRoot) {
                            tapUpdate.tapMerkleRoot = merkleRoot;
                        }
                        psbt.updateInput(idx, tapUpdate);
                        input = psbt.data.inputs[idx];
                    } else {
                        throw new Error(
                            `PSBT input #${idx}: Taproot UTXO does not match this wallet (missing tapInternalKey in PSBT). ` +
                                `Add tapInternalKey (32-byte x-only internal pubkey) to the input, and tapMerkleRoot if used.`
                        );
                    }
                }

                // bitcoinjs key-path signing requires toXOnly(signerPubkey) === output key in witnessUtxo (tweaked Q).
                const outputMatchesInternal =
                    !!outputKeyXOnly && xOnlyInternal.equals(outputKeyXOnly);
                const dappWantsUntweakedSigner =
                    spec?.disableTweakSigner === true || spec?.useTweakedSigner === false;
                if (dappWantsUntweakedSigner && outputMatchesInternal) {
                    signer = pathKey;
                } else {
                    const tweak = tapTweakHash(xOnlyInternal, merkleRoot);
                    signer = pathKey.tweak(tweak);
                }
            }

            const sighashTypes = spec?.sighashTypes;
            if (sighashTypes?.length) {
                psbt.signInput(idx, signer, sighashTypes);
            } else {
                psbt.signInput(idx, signer);
            }
        }

        if (autoFinalized) {
            try {
                psbt.finalizeAllInputs();
            } catch (e) {
                Logger.warn('wallet', 'BTCWalletJSSafe signPsbt finalizeAllInputs:', e);
            }
        }

        return psbt.toHex();
    }

    public async signMessage(message: string): Promise<string> {
        let keypair = await this.getKeyPair(true);
        if (!keypair) {
            // User canceled the password
            return null;
        }
        // TODO: class BIP32 is not exported.
        return bitcoinMessage.sign(message, keypair.privateKey, (keypair as any).compressed).toString('base64')
    }

    public createBTCPaymentTransaction(inputs: BTCUTXO[], outputs: BTCOutputData[], changeAddress: string, feePerKB: string, fee: number): Promise<any> {
        let txData: BTCTxData = {
            inputs: inputs,
            outputs: outputs,
            changeAddress: changeAddress,
            feePerKB: feePerKB,
            fee: fee
        }
        return Promise.resolve(txData);
    }

    public async signTransaction(subWallet: AnySubWallet, rawTransaction: BTCTxData, transfer: Transfer): Promise<SignTransactionResult> {
        let signTransactionResult: SignTransactionResult = {
            signedTransaction: null
        }
        Logger.log('wallet', 'BTCWalletJSSafe signTransaction ', rawTransaction)

        let keypair = await this.getKeyPair(true);
        if (!keypair) {
            // User canceled the password
            return signTransactionResult;
        }

        const psbt = new BTC.Psbt({ network: this.btcNetwork });

        let xOnlyPubkey = null, scriptOutput = null, tweakedChildNode = null;
        if (this.bitcoinAddressType === BitcoinAddressType.Taproot) {
          xOnlyPubkey = toXOnly(Buffer.from(this.btcPublicKey, 'hex'));

          // This is new for taproot
          const { output } = BTC.payments.p2tr({
            internalPubkey:xOnlyPubkey,
          });

          scriptOutput = output;

          // Used for signing, since the output and address are using a tweaked key
          // We must tweak the signer in the same way.
          tweakedChildNode = keypair.tweak(
            BTC.crypto.taggedHash('TapTweak', xOnlyPubkey),
          );
        }

        let totalAmount = 0;
        rawTransaction.inputs.forEach(input => {
            let value = parseInt(input.value)
            totalAmount += value;
            if (this.bitcoinAddressType !== BitcoinAddressType.Taproot) {
              psbt.addInput({hash:input.txid, index:input.vout, nonWitnessUtxo: Buffer.from(input.utxoHex, 'hex')});
            } else {
              psbt.addInput({
                hash:input.txid, index:input.vout,
                witnessUtxo: { value: value, script: scriptOutput },
                tapInternalKey: xOnlyPubkey,
              })
            }
        })

        rawTransaction.outputs.forEach(output => {
            psbt.addOutput({address:output.Address, value: output.Amount});
        })

        // change
        let changeAmount = totalAmount - rawTransaction.outputs[0].Amount - rawTransaction.fee;
        Logger.log('wallet', 'BTCWalletJSSafe changeAmount ', changeAmount)
        if (changeAmount >= UtxoDust) {
            psbt.addOutput({address: this.btcAddress, value: changeAmount});
        } else {
            // Bitcoin Core considers a transaction output to be dust, when its value is lower than the cost of spending it at the dustRelayFee rate.
            Logger.log('wallet', 'BTCWalletJSSafe changeAmount too small, dust')
        }

        if (this.bitcoinAddressType === BitcoinAddressType.Taproot) {
          psbt.signAllInputs(tweakedChildNode);
        } else {
          psbt.signAllInputs(keypair);
        }
        psbt.finalizeAllInputs();

        let tx_hex = psbt.extractTransaction().toHex()
        if (tx_hex) {
            signTransactionResult.signedTransaction = tx_hex;
        }
        return signTransactionResult;
    }
}