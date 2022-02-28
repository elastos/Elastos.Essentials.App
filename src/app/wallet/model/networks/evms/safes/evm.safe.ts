import { Safe } from "../../../safes/safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export abstract class EVMSafe extends Safe {
  public getAddresses(): Promise<string[]> {
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
  public abstract personalSign(): string // TODO - Just an example for now
}