import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { SignTransactionResult } from "../../../safes/safe.types";
import { EVMSafe } from "../../evms/safes/evm.safe";

export class ETHSafe extends EVMSafe {
  public personalSign(): string {
    throw new Error("Method not implemented.");
  }

  public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {

    // TODO: @zhiming call hw-app-eth from ledger here

    throw new Error("Method not implemented.");
  }
}