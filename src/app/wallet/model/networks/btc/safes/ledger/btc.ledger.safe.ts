import Btc from "@ledgerhq/hw-app-btc";
import { toBufferLE } from 'bigint-buffer';
import * as bitcoin from 'bitcoinjs-lib';
import { testnet } from "bitcoinjs-lib/src/networks";
import { TxData } from "ethereumjs-tx";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { LeddgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { Safe } from "src/app/wallet/model/safes/safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { BTCSafe } from "../btc.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class BTCLedgerSafe extends Safe implements BTCSafe {
    private address = null;

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

    public async createBTCPaymentTransaction(inputs: any, outputs: any, changeAddress: string, feePerKB: string): Promise<any> {
      Logger.warn('wallet', 'createBTCPaymentTransaction inputs', inputs, ' outputs:', outputs)
      let transport = await BluetoothTransport.open(this.masterWallet.deviceID);

      const btc = new Btc(transport);
      const additionals: string[] = [];
      // if (accountType == StandardPurpose.p2wpkh) {
        additionals.push("bech32");
      // }
      // if (accountType == StandardPurpose.p2tr) {
      //   additionals.push("bech32m");
      // }

      let input = []

      const utxoHex = "02000000000101a5bf2d7cfe3535904948e7f5733005fa32a345872ffa57ec9a2030110b601d7f0000000000feffffff023c8a017100000000160014f1dc60b92c630128bb72f6b7082ae7e00d202245f824010000000000160014011cea78bc744523ba0940e683208095a56ebf7e024730440220009096e231d2b814d64f2e5825fc5dbcde021cd06439607567b1c34fa0fab07c022067795c498e14d160e12be6cc4942e671876dbace19601d2edd59e23d8a3f47c501210291e0d8c8e791f519534279063e24b9916da2bf1712527823bf7c87ff012491c2f3672100";
      const txIndex = 1;
      const inTx = btc.splitTransaction(utxoHex, true, false);
      // Logger.warn('wallet', ' splitTransaction inTx:', inTx)

      // let network = GlobalNetworksService.instance.getActiveNetworkTemplate();

      // only support p2wpkh.
      const payment = bitcoin.payments.p2wpkh({ address: outputs[0].Address.toLowerCase(), network: testnet });

      // Logger.warn('wallet', ' payment:', payment)
      const outputScriptHex = btc.serializeTransactionOutputs({
          version: Buffer.from("01000000", 'hex'),
          inputs: [],
          outputs: [{
              amount: toBufferLE(BigInt(outputs[0].Amount), 8),
              script: payment.output!,
          }]
      }).toString('hex');

      const result = await btc.createPaymentTransactionNew({
          inputs: [[inTx, txIndex, undefined, undefined]],
          associatedKeysets: [ "84'/1'/0'/0/0" ], // use the right path
          outputScriptHex,
          // segwit: true,
          // sigHashType: 1,
          additionals: ["bitcoin", "bech32"],
      });

      Logger.warn('wallet', ' result:', result)

      const tx = bitcoin.Transaction.fromHex(result);
      // Logger.warn('wallet', ' tx:', tx)

      let txhash = tx.getHash();
      // let txid = tx.getId();
      // Logger.warn('wallet', ' txhash:', txhash)
      // Logger.warn('wallet', ' txid:', txid)
      return txhash;
    }

    splitTransaction(ledger, tx) {
      return ledger.splitTransaction(tx.toHex(), tx.hasWitnesses());
    }


    public signTransaction(txData: TxData, transfer: Transfer): Promise<SignTransactionResult> {

      throw new Error("Method not implemented.");
    }

    public signTransactionByLedger(transport: BluetoothTransport) {
      // const ledgerBTC = new AppBtc(transport);
      throw new Error("Method not implemented.");
    }
}
