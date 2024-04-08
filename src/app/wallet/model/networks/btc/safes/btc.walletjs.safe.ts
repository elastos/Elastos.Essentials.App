import * as BTC from 'bitcoinjs-lib';
import { Payment } from 'bitcoinjs-lib';
import { bitcoin, testnet } from "bitcoinjs-lib/src/networks";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { Logger } from "src/app/logger";
import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { BTCOutputData, BTCTxData, BTCUTXO, BTC_MAINNET_PATHS, BitcoinAddressType, UtxoDust } from "../../../btc.types";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from '../../../safes/safe.types';
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from '../../base/subwallets/subwallet';
import { BTCSafe } from "./btc.safe";

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

    constructor(protected masterWallet: StandardMasterWallet, protected chainId: string, protected bitcoinAddressType = BitcoinAddressType.Legacy) {
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
            const BIP32Wrapper = require('bip32').default;
            // wrap the bip32 library
            const bip32 = BIP32Wrapper(ecc);

            // For taproot
            BTC.initEccLib(ecc)

            let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
            return bip32.fromSeed(Buffer.from(seed, "hex"), this.btcNetwork)
        } catch (e) {
            Logger.warn('wallet', 'getKeyPair exception:', e)
        }
    }

    private async getKeyPair(forceShowMasterPrompt = false) {
        try {
            const root = await this.getRoot(forceShowMasterPrompt)
            if (root) {
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
      let keypair = await this.getKeyPair(false);
      if (!keypair) {
          // User canceled the password
          return null;
      }

      const secp256k1 = require('secp256k1');
      let signObj = secp256k1.sign(Buffer.from(digest, "hex"), keypair.privateKey);
      if (signObj) {
        return signObj.signature.toString('hex');
      }
      else return null;
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