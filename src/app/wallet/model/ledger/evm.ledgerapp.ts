import AppEth from "@ledgerhq/hw-app-eth";
import Transport from "@ledgerhq/hw-transport";
import { Logger } from "src/app/logger";
import { LedgerAccount, LedgerApp } from "./ledgerapp";

export class EVMLedgerApp extends LedgerApp {
  private ethApp : AppEth = null;
  private paths = ["44'/60'/x'/0/0", "44'/60'/0'/0/x'"];

  constructor(protected transport: Transport) {
    super(transport);

    this.ethApp = new AppEth(transport);
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount[]> {
    let addresses = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      // const x = Math.floor(i / this.paths.length);
      // const pathIndex = i - this.paths.length * x;
      // const path = this.paths[pathIndex].replace("x", String(x));
      const path = this.paths[0].replace("x", String(i));
      const address = await this.ethApp.getAddress(path, false, false);

      addresses.push({
          type:'EVM',
          address:address.address,
          pathIndex:i,
          path
      })
    }

    Logger.warn('wallet', "EVMLedgerApp Addresses :", addresses);
    return addresses;
  }

  public signTransaction(unsignedTx: string): Promise<any> {
    // TODO: use the right HD derivation path.
    return this.ethApp.signTransaction("44'/60'/0'/0/0", unsignedTx);
  }
}