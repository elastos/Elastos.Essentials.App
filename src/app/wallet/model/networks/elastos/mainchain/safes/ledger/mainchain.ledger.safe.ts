import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";

export class MainChainLedgerSafe extends LedgerSafe {
  public getAddresses(): Promise<string[]> {
    // TODO: use the elastos-mainchain-app ledger 'app' to talk to the ELA ledger app to get addresses
    throw new Error("Method not implemented.");
  }

  public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {
    // TODO: use the elastos-mainchain-app ledger 'app' to talk to the ELA ledger app to sign
    throw new Error("Method not implemented.");
  }
}