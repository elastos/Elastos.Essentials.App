import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Safe } from "./safe";

/**
 * Safe for software wallets hosted by Essentials.
 */
export abstract class LedgerSafe extends Safe {
  public abstract signTransactionByLedger(transport: BluetoothTransport);
}