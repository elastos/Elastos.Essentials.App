import Transport from "@ledgerhq/hw-transport";
import { LeddgerAccountType } from "../ledger.types";

export type LedgerAccount = {
  type: LeddgerAccountType;
  address: string;
  pathIndex: number;
  path: string;
  publicKey: string;
}

export abstract class LedgerApp {
  constructor(protected transport: Transport) { }

  public abstract getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount[]>;
}