import Transport from "@ledgerhq/hw-transport";
import { LedgerAccount, LedgerApp } from "./ledgerapp";

export class ELALedgerApp extends LedgerApp {

  constructor(protected transport: Transport) {
    super(transport);
    // TODO: create ela app.
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount[]>{
    throw new Error("Method not implemented.");
  }

  public signTransaction(unsignedTx: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
}