import Transport from "@ledgerhq/hw-transport";

export type LedgerAccount = {
  type: string;
  address: string;
  pathIndex: number;
  path: string;
}

export abstract class LedgerApp {
  constructor(protected transport: Transport) { }

  public abstract getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount[]>;

  public abstract signTransaction(unsignedTx: string): Promise<any>;
}