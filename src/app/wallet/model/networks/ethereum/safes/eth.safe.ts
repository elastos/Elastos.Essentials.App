import { TxData } from "@ethereumjs/tx";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { SignTransactionResult } from "../../../safes/safe.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EVMLedgerSafe } from "../../evms/safes/evm.ledger.safe";

export class ETHSafe extends EVMLedgerSafe {
  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    // TODO: Move this code to each network, because not all EVM networks support ledger,
    // and they use a different ledger app each time (AppEth)

    /* Get the address:
    this.transport = await BluetoothTransport.create();
    const eth = new AppEth(this.transport);
    const path = "44'/60'/0'/0/0"; // HD derivation path
    const r = await eth.getAddress(path, true, true); // user need open eth app and approve in ledger device.
    const address = eip55.encode(r.address);
    Logger.warn('ledger', "address :", address); */
    return null;
  }

  public personalSign(): string {
    throw new Error("Method not implemented.");
  }

  public signTransaction(subWallet: AnySubWallet, rawTx: TxData, transfer: Transfer): Promise<SignTransactionResult> {

    // TODO: @zhiming call hw-app-eth from ledger here

    throw new Error("Method not implemented.");
  }
}