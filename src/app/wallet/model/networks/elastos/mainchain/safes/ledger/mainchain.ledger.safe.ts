import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { LeddgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { ElastosMainChainSafe } from "../mainchain.safe";

export class MainChainLedgerSafe extends LedgerSafe implements ElastosMainChainSafe {
  private elaAddress = null;
  private addressPath = '';

  constructor(protected masterWallet: LedgerMasterWallet) {
    super(masterWallet);
    this.initELAAddress();
  }

  initELAAddress() {
    if (this.masterWallet.accountOptions) {
      let elaOption = this.masterWallet.accountOptions.find( (option)=> {
        return option.type ===  LeddgerAccountType.ELA
      })
      if (elaOption) {
        this.elaAddress = elaOption.accountID;
        this.addressPath = elaOption.accountPath;
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
    return Promise.resolve('');
  }

  public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {
    // TODO: use the elastos-mainchain-app ledger 'app' to talk to the ELA ledger app to sign
    throw new Error("Method not implemented.");
  }

  public signTransactionByLedger(transport: BluetoothTransport) {
    throw new Error("Method not implemented.");
  }
}