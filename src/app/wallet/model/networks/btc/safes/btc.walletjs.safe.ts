import * as BTC from 'bitcoinjs-lib';
import { Payment } from 'bitcoinjs-lib';
import { bitcoin, testnet } from "bitcoinjs-lib/src/networks";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { Logger } from "src/app/logger";
import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { BTCOutputData, BTCSignDataType, BTCTxData, BTCUTXO, BTC_MAINNET_PATHS, BitcoinAddressType, UtxoDust } from "../../../btc.types";
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