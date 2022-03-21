import Btc from "@ledgerhq/hw-app-btc";
import { toBufferLE } from 'bigint-buffer';
import { getAddressInfo } from "bitcoin-address-validation";
import * as bitcoinjs from 'bitcoinjs-lib';
import { toOutputScript } from "bitcoinjs-lib/src/address";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { BTCOutputData, BTCSignedTransactionResult, BTCTxData, BTCUtxoForLedger } from "src/app/wallet/model/btc.types";
import { LeddgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { Safe } from "src/app/wallet/model/safes/safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { WalletUIService } from "src/app/wallet/services/wallet.ui.service";
import { BTCSafe } from "../btc.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class BTCLedgerSafe extends Safe implements BTCSafe {
    private address = null;
    private txData = null;
    private signedTx = null;

    constructor(protected masterWallet: LedgerMasterWallet) {
        super(masterWallet);

        this.initAddress();
    }

    initAddress() {
        if (this.masterWallet.accountOptions) {
            let option = this.masterWallet.accountOptions.find( (option)=> {
                return option.type ===  LeddgerAccountType.BTC
            })
            if (option) {
                this.address = option.accountID;
            }
        }
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
        if (this.address) {
            return Promise.resolve([this.address]);
        }
        else {
            throw new Error("BTCSafe: No btc address.");
        }
    }

    public createBTCPaymentTransaction(inputs: BTCUtxoForLedger[], outputs: BTCOutputData[], changeAddress: string, feePerKB: string): Promise<any> {
      let txData : BTCTxData = {
        inputs: inputs,
        outputs: outputs,
        changeAddress: changeAddress,
        feePerKB: feePerKB
      }
      return Promise.resolve(txData);
    }

    private prepareOutputsForLedger(txData: BTCTxData, network) {
      let totalAmount = 0;
      for (let i = 0; i < txData.inputs.length; i++) {
        totalAmount += parseInt(txData.inputs[i].Amount);
      }

      // TODO: Calculate the size of the transaction.
      let fees = Util.accMul(parseFloat(txData.feePerKB), Config.SATOSHI);

      let changeAmount = totalAmount - parseInt(txData.outputs[0].Amount) - fees;
      Logger.log('wallet', 'BTC transaction:changeAmount:', changeAmount, ' fees:', fees, ' totalAmount:', totalAmount)

      const toScript = toOutputScript(txData.outputs[0].Address, network)
      const changeScript = toOutputScript(txData.changeAddress, network)

      let outputs = [{
            amount: toBufferLE(BigInt(txData.outputs[0].Amount), 8),
            script: toScript,
        }, {
            amount: toBufferLE(BigInt(changeAmount), 8),
            script: changeScript,
        }
      ]
      return outputs;
    }

    public async signTransaction(txData: BTCTxData, transfer: Transfer): Promise<SignTransactionResult> {
        this.txData = txData;
        this.signedTx = null;

        let signTransactionResult: SignTransactionResult = {
            signedTransaction : null
        }

        // Wait for the ledger sign the transaction.
        let signed = await WalletUIService.instance.connectLedger(this.masterWallet.deviceID, this)
        if (!signed) {
            Logger.log('ledger', "BTCLedgerSafe::signTransaction can't connect to ledger or user canceled");
            return signTransactionResult;
        }

        const tx = bitcoinjs.Transaction.fromHex(this.signedTx);

        let btcSignedData: BTCSignedTransactionResult = {
          Data : this.signedTx,
          TxHash : tx.getId(),
        }

        signTransactionResult.signedTransaction = JSON.stringify(btcSignedData)
        return signTransactionResult;
    }

    public async signTransactionByLedger(tp: BluetoothTransport) {
      let transport = await BluetoothTransport.open(this.masterWallet.deviceID);

      const btc = new Btc(transport);

      let addressInfo = getAddressInfo(this.address)
      const additionals: string[] = [];
      if (addressInfo.bech32) {
        additionals.push("bech32");
      }

      // test data
      // this.txData.inputs = [
      //   {
      //     Address: "tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6",
      //     Amount: "1625046",
      //     Index: 0,
      //     TxHash: "ccdcc16814b4664bee5b523955845d751824d82a87ed5b21086871c0eeee7653",
      //     utxoHex: "02000000000101bff62fd4ddd885940b6d6c8a18e901430fe2c2e41a25284bd398ef5b6b52a4120100000000feffffff02d6cb180000000000160014011cea78bc744523ba0940e683208095a56ebf7e1a2ee72b0300000016001491030479aeab2fa64cad99a4aa6186ff20eb664b0247304402200c06102fbfa55ecac4e2dda81bf6d02a008bd31c48981db4bf0ac6dfa062a624022055cf5db944f29ccd76f68954e6c48d9c64af2cf7d7b7f13b9a2926b446816a59012102de7ea89e199c35771633242c1a1fd4d749d77c7615c5467c6c39fa48073370ac016d2100"
      //   },{
      //     Address: "tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6",
      //     Amount: "10000",
      //     Index: 0,
      //     TxHash: "c305e9ced08d8c6fa602e33f55ff194528903db1826e4e81d83f22a1df1b1daf",
      //     utxoHex: "02000000000101a98fdd458be30bf551f16a37f6feea22537398d744922cf242faaa96413016ee0100000000ffffffff011027000000000000160014011cea78bc744523ba0940e683208095a56ebf7e02483045022100e9ebee6ab6f1fad6b925af67e25d3581ff290928b88f24c606fecf75d93d2215022078be753c8f25238582c4becb06049386a247615716a1a980f57f931c04bc1f7501210292cb0cd450e6dea3c5aac375d0cb82da00bc94415091e7bbfd0c94434c6eacdb00000000"
      //   }
      // ]

      let ledgerInputs = [];
      let keysets = [];
      for (let i = 0; i < this.txData.inputs.length; i++) {
        let tx = bitcoinjs.Transaction.fromHex(this.txData.inputs[i].utxoHex);
        let hasWitnesses = tx.hasWitnesses();
        const inTx = btc.splitTransaction(this.txData.inputs[i].utxoHex, hasWitnesses, false);
        ledgerInputs.push([inTx, this.txData.inputs[i].Index, undefined, undefined])
        keysets.push("84'/1'/0'/0/0"); // TODO use the right path
      }
      Logger.warn('wallet', ' ledgerInputs:', ledgerInputs, keysets)

      const outputScriptHex = btc.serializeTransactionOutputs({
          version: Buffer.from("01000000", 'hex'),
          inputs: [],
          outputs: this.prepareOutputsForLedger(this.txData, addressInfo.network)
      }).toString('hex');

      this.signedTx = await btc.createPaymentTransactionNew({
          inputs: ledgerInputs,
          associatedKeysets: keysets,
          outputScriptHex,
          // segwit: true, //TODO
          // sigHashType: 1,
          additionals: ["bech32"],
      });
      Logger.warn('wallet', 'BTCLedgerSafe this.signedTx:', this.signedTx)
    }
}
