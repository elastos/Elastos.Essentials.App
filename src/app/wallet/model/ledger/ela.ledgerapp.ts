import Transport from "@ledgerhq/hw-transport";
import Ela from "src/app/helpers/ledger/hw-app-ela/Ela";
import { Logger } from "src/app/logger";
import { LedgerAccountType } from "../ledger.types";
import { AnyLedgerAccount, LedgerApp } from "./ledgerapp";

export enum ELAAddressType {
  //  M0 = "m0",
  M2305 = "m2305",
}

const ela_paths = {
  //  "m0": "44'/0'/0'/0/x",
  "m2305": "44'/2305'/0'/0/x",
};

export class ELALedgerApp extends LedgerApp<ELAAddressType> {
  private elaApp: Ela = null;

  constructor(protected transport: Transport) {
    super(transport);

    this.elaApp = new Ela(this.transport);
  }

  public async getAddressesByType(startIndex: number, count: number, type: ELAAddressType): Promise<AnyLedgerAccount[]> {
    let addresses = [];
    let path = ela_paths[type] || ela_paths[0];
    for (let i = startIndex; i < startIndex + count; i++) {
      const realPath = path.replace("x", String(i));
      const address = await this.elaApp.getAddress(realPath);

      addresses.push({
        type: LedgerAccountType.ELA,
        address: address.address,
        pathIndex: i,
        path,
        publicKey: address.publicKey
      })
    }

    Logger.warn('wallet', "ELALedgerApp Addresses :", addresses);
    return addresses;
  }

  public async getAddresses(addressType: ELAAddressType, startIndex: number, count: number, internalAddresses: boolean): Promise<AnyLedgerAccount[]> {
    return await this.getAddressesByType(startIndex, count, addressType);
  }
}