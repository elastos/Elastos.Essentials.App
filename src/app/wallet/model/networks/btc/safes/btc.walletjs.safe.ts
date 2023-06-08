import * as BTC from 'bitcoinjs-lib';
import { bitcoin, testnet } from "bitcoinjs-lib/src/networks";
import { Logger } from "src/app/logger";
import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { BTCOutputData, BTCTxData, BTCUTXO } from "../../../btc.types";
import { BTCAddressType } from "../../../ledger/btc.ledgerapp";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { BTCSafe } from "./btc.safe";

const DefaultDerivationPath = "44'/0'/0'/0/0";
const DUST = 550; // TODO: How to calculate the dust value?

export class BTCWalletJSSafe extends Safe implements BTCSafe {
    private btcAddress = null;
    private btcNetwork = bitcoin;

    constructor(protected masterWallet: StandardMasterWallet, protected chainId: string) {
        super(masterWallet);
    }

    public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
        await super.initialize(networkWallet);

        if (networkWallet.network.networkTemplate === TESTNET_TEMPLATE) {
            this.btcNetwork = testnet;
        }

        // Check if the address is already computed or not  (first time). If not, request the
        // master password to compute it
        this.btcAddress = await networkWallet.loadContextInfo("btcAddress");
        if (!this.btcAddress) {
          await this.initJSWallet()

          if (this.btcAddress)
            await networkWallet.saveContextInfo("btcAddress", this.btcAddress);
        }
    }

    private async initJSWallet() {
        // No data - need to compute
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
        if (!payPassword)
            return; // Can't continue without the wallet password - cancel the initialization

        try {
            let keypair = await this.getKeyPair(DefaultDerivationPath);
            if (keypair) this.btcAddress = await this.getAddress(keypair);
        } catch (e) {
            Logger.warn('wallet', 'initJSWallet exception:', e)
        }
    }

    private async getKeyPair(path: string, forceShowMasterPrompt = false) {
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, forceShowMasterPrompt);
        if (!payPassword)
            return;

        try {
            // tiny-secp256k1 v2 is an ESM module, so we can't "require", and must import async
            const ecc = await import('tiny-secp256k1');
            const BIP32Wrapper = require('bip32').default;
            // wrap the bip32 library
            const bip32 = BIP32Wrapper(ecc);

            let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
            const root = bip32.fromSeed(Buffer.from(seed, "hex"), this.btcNetwork)
            const keyPair = root.derivePath(path)
            return keyPair;
        } catch (e) {
            Logger.warn('wallet', 'getKeyPair exception:', e)
        }
    }

    private async getAddress(keyPair, type = BTCAddressType.LEGACY) {
        let address = null;
        switch (type) {
            case BTCAddressType.LEGACY:
                address = BTC.payments.p2pkh({ pubkey: keyPair.publicKey , network: this.btcNetwork});
            break;
            case BTCAddressType.SEGWIT:
                // Native Segwit
                address = BTC.payments.p2wpkh({pubkey: keyPair.publicKey, network: this.btcNetwork});
            break;
            case BTCAddressType.P2SH:
                address =  BTC.payments.p2sh({
                    redeem: BTC.payments.p2wpkh({pubkey: keyPair.publicKey, network: this.btcNetwork}),
                })
            break;
        }
        return address?.address;
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
        return [this.btcAddress];
    }

    public async signDigest(address: string, digest: string, password: string): Promise<string> {
      return null;
    }

    public async createBTCPaymentTransaction(inputs: BTCUTXO[], outputs: BTCOutputData[], changeAddress: string, feePerKB: string, fee: number): Promise<any> {
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

        let keypair = await this.getKeyPair(DefaultDerivationPath, true);
        if (!keypair) {
            // User canceled the password
            return signTransactionResult;
        }

        const psbt = new BTC.Psbt({ network: this.btcNetwork });

        let totalAmount = 0;
        rawTransaction.inputs.forEach(input => {
            totalAmount += parseInt(input.value);
            psbt.addInput({hash:input.txid, index:input.vout, nonWitnessUtxo: Buffer.from(input.utxoHex, 'hex')});
            // For witnessUtxo
            // psbt.addInput({hash:input.TxHash, index:input.Index, witnessUtxo: {
            //     script: Buffer.from(input.scriptPubKey.hex, 'hex'),
            //     value: input.Amount * 100000000}
            // });
        })

        rawTransaction.outputs.forEach(output => {
            psbt.addOutput({address:output.Address, value: output.Amount});
        })

        // change
        let changeAmount = totalAmount - rawTransaction.outputs[0].Amount - rawTransaction.fee;
        Logger.log('wallet', 'BTCWalletJSSafe changeAmount ', changeAmount)
        if (changeAmount >= DUST) {
            psbt.addOutput({address: this.btcAddress, value: changeAmount});
        } else {
            // Bitcoin Core considers a transaction output to be dust, when its value is lower than the cost of spending it at the dustRelayFee rate.
            Logger.log('wallet', 'BTCWalletJSSafe changeAmount too small, dust')
        }

        psbt.signAllInputs(keypair);
        psbt.finalizeAllInputs();

        let tx_hex = psbt.extractTransaction().toHex()
        if (tx_hex) {
            signTransactionResult.signedTransaction = tx_hex;
        }
        return signTransactionResult;
    }
}