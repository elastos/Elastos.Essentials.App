import { Logger } from "src/app/logger";
import { AnyNetwork } from "../networks/network";
import { MasterWallet } from "./masterwallet";
import { LedgerAccountOptions, SerializedLedgerMasterWallet } from "./wallet.types";

export class LedgerMasterWallet extends MasterWallet {
  public deviceID = '';
  public accountOptions: LedgerAccountOptions[] = [];

  public static newFromSerializedWallet(serialized: SerializedLedgerMasterWallet): LedgerMasterWallet {
    let masterWallet = new LedgerMasterWallet();

    // Base type deserialization
    masterWallet.deserialize(serialized);
    Logger.warn('wallet', 'LedgerMasterWallet newFromSerializedWallet serialized:', serialized, 'masterWallet:', masterWallet)
    return masterWallet;
  }

  protected deserialize(serialized: SerializedLedgerMasterWallet) {
    super.deserialize(serialized);

    // TODO: ledger specific data
    this.deviceID = serialized.deviceID;

    this.accountOptions = serialized.accountOptions;
  }

  public serialize(): SerializedLedgerMasterWallet {
    let serialized: SerializedLedgerMasterWallet = {} as SerializedLedgerMasterWallet; // Force empty

    super._serialize(serialized as SerializedLedgerMasterWallet);

    // TODO: ledger specific data
    serialized.deviceID = this.deviceID;
    serialized.accountOptions = this.accountOptions;
    return serialized;
  }

  public hasMnemonicSupport(): boolean {
    console.log("Ledger masterwallet hasMnemonicSupport not implemented");
    return true; // TODO - this hasMnemonicSupport() doesn't make enough sense, what does this mean?
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    console.log("Ledger masterwallet supportsNetwork not implemented");
    return true; // TODO: implement
  }
}
