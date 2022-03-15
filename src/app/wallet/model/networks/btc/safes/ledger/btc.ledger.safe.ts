import { TxData } from "ethereumjs-tx";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { LeddgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { Safe } from "src/app/wallet/model/safes/safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class BTCLedgerSafe extends Safe {
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

    public createTransfer(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
      throw new Error("Method not implemented.");
    }

    public signTransaction(txData: TxData, transfer: Transfer): Promise<SignTransactionResult> {

      throw new Error("Method not implemented.");
    }

    public async signTransactionByLedger(transport: BluetoothTransport) {

    }
}