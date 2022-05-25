import { ELATransactionCoder } from "src/app/helpers/ela/ela.transaction.coder";
import { ELATransactionFactory } from "src/app/helpers/ela/ela.transaction.factory";
import { ELATransactionSigner } from "src/app/helpers/ela/ela.transaction.signer";
import Ela from "src/app/helpers/ledger/hw-app-ela/Ela";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { LedgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { ElastosMainChainSafe } from "../mainchain.safe";

const LEDGER_UTXO_CONSOLIDATE_COUNT = 20; // Ledger: Starting UTXOs count to get TX size from
const MAX_TX_SIZE = 1000; // for Ledger, 1024 does not work correctly

export class MainChainLedgerSafe extends LedgerSafe implements ElastosMainChainSafe {
  private elaAddress = null;
  private publicKey = '';
  private addressPath = '';

  constructor(protected masterWallet: LedgerMasterWallet) {
    super(masterWallet);
    this.initELAAddress();
  }

  initELAAddress() {
    if (this.masterWallet.accountOptions) {
      let elaOption = this.masterWallet.accountOptions.find((option) => {
        return option.type === LedgerAccountType.ELA
      })
      if (elaOption) {
        this.elaAddress = elaOption.accountID;
        this.addressPath = elaOption.accountPath;
        this.publicKey = elaOption.publicKey;
      }
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    if (this.elaAddress) {
      return Promise.resolve([this.elaAddress]);
    }
    else {
      throw new Error("MainChainLedgerSafe: No ela address.");
    }
  }

  public getOwnerAddress(): Promise<string> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public async createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any> {
    Logger.warn('wallet', 'MainChainLedgerSafe createPaymentTransaction inputs:', inputs, ' outputs:', outputs, ' fee:', fee, ' memo:', memo)

    let tx = ELATransactionFactory.createUnsignedSendToTx(inputs, outputs[0].Address, outputs[0].Amount,
      this.publicKey, fee, '', memo);
    Logger.warn('wallet', 'createPaymentTransaction:', JSON.stringify(tx))
    return await tx;
  }

  public async signTransaction(subWallet: AnySubWallet, tx: any, transfer: Transfer): Promise<SignTransactionResult> {
    // TODO: use the elastos-mainchain-app ledger 'app' to talk to the ELA ledger app to sign
    const rawTx = ELATransactionCoder.encodeTx(tx, false);
    if (Math.ceil(rawTx.length / 2) > MAX_TX_SIZE) {
      Logger.warn('wallet', 'MainChainLedgerSafe createPaymentTransaction: TX size too big') // if TX size too big, try less UTXOs
    }
    Logger.warn('wallet', 'MainChainLedgerSafe signTransaction:', rawTx);

    let signTransactionResult: SignTransactionResult = {
      signedTransaction: null
    }

    const ela = new Ela(null);
    let response = await ela.signTransaction(rawTx, this.addressPath);
    if (!response.success) {
      return signTransactionResult;
    }

    const signature = Buffer.from(response.signature, 'hex');
    const encodedTx = ELATransactionSigner.addSignatureToTx(tx, this.publicKey, signature);
    Logger.warn('wallet', 'MainChainLedgerSafe encodedTx:', encodedTx);
    signTransactionResult.signedTransaction = encodedTx
    return signTransactionResult;
  }

  public signTransactionByLedger(transport: BluetoothTransport) {
    throw new Error("Method not implemented.");
  }
}

