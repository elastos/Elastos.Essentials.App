import Transport from "@ledgerhq/hw-transport";
import { BTCAddressType } from "../btc.types";
import { LedgerAccountType } from "../ledger.types";
import { ELAAddressType } from "./ela.ledgerapp";
import { EVMAddressType } from "./evm.ledgerapp";

export type LedgerAddressType = BTCAddressType | ELAAddressType | EVMAddressType;

export type LedgerAccount<AddressType extends LedgerAddressType> = {
  type: LedgerAccountType;
  addressType: AddressType;
  address: string;
  pathIndex: number;
  path: string;
  publicKey: string;
}

export type AnyLedgerAccount = LedgerAccount<any>;

export abstract class LedgerApp<AddressType extends LedgerAddressType> {
  constructor(protected transport: Transport) { }

  public abstract getAddresses(addressType: AddressType, startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount<AddressType>[]>;

  public getDisplayableAddressType(addressType: AddressType): string {
    return null;
  }
}