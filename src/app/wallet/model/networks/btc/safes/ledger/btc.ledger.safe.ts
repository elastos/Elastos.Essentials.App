import Btc from "@ledgerhq/hw-app-btc";
import { toBufferLE } from 'bigint-buffer';
import { getAddressInfo } from "bitcoin-address-validation";
import * as bitcoinjs from 'bitcoinjs-lib';
import { toOutputScript } from "bitcoinjs-lib/src/address";
import { bitcoin, testnet } from "bitcoinjs-lib/src/networks";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { BTCOutputData, BTCTxData, BTCUTXO } from "src/app/wallet/model/btc.types";
import { LedgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { Safe } from "src/app/wallet/model/safes/safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { WalletUIService } from "src/app/wallet/services/wallet.ui.service";
import { AnySubWallet } from "../../../base/subwallets/subwallet";
import { BTCSafe } from "../btc.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class BTCLedgerSafe extends Safe implements BTCSafe {
  private address = null;
  private addressPath = ''
  private txData: BTCTxData = null;
  private signedTx = null;

  constructor(protected masterWallet: LedgerMasterWallet) {
    super(masterWallet);

    this.initAddress();
  }

  initAddress() {
    if (this.masterWallet.accountOptions) {
      let option = this.masterWallet.accountOptions.find((option) => {
        return option.type === LedgerAccountType.BTC
      })
      if (option) {
        this.address = option.accountID;
        this.addressPath = option.accountPath;
      }
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
    if (this.address) {
      return [this.address];
    }
    else {
      throw new Error("BTCSafe: No btc address.");
    }
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

  private prepareOutputsForLedger(txData: BTCTxData, networkStr: string) {
    let totalAmount = 0;
    for (let i = 0; i < txData.inputs.length; i++) {
      totalAmount += parseInt(txData.inputs[i].value);
    }

    let changeAmount = totalAmount - txData.outputs[0].Amount - txData.fee;
    Logger.log('wallet', 'BTC transaction:changeAmount:', changeAmount, ' fees:', txData.fee, ' totalAmount:', totalAmount)

    let network = bitcoin;
    if (networkStr === 'testnet') {
      network = testnet;
    }
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

  public async signTransaction(subWallet: AnySubWallet, txData: BTCTxData, transfer: Transfer): Promise<SignTransactionResult> {
    this.txData = txData;
    this.signedTx = null;

    let signTransactionResult: SignTransactionResult = {
      signedTransaction: null
    }

    // Wait for the ledger sign the transaction.
    let signed = await WalletUIService.instance.connectLedgerAndSignTransaction(this.masterWallet.deviceID, this)
    if (!signed) {
      Logger.log('ledger', "BTCLedgerSafe::signTransaction can't connect to ledger or user canceled");
      return signTransactionResult;
    }

    signTransactionResult.signedTransaction = this.signedTx;
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

    let ledgerInputs = [];
    let keysets = [];
    for (let i = 0; i < this.txData.inputs.length; i++) {
      let tx = bitcoinjs.Transaction.fromHex(this.txData.inputs[i].utxoHex);
      let hasWitnesses = tx.hasWitnesses();
      const inTx = btc.splitTransaction(this.txData.inputs[i].utxoHex, hasWitnesses, false);
      ledgerInputs.push([inTx, this.txData.inputs[i].vout, undefined, undefined])
      keysets.push(this.addressPath);
    }

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
      additionals: additionals,
    });
    Logger.log('wallet', 'BTCLedgerSafe this.signedTx:', this.signedTx)
  }
}
