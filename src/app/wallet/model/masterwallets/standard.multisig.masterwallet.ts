import { AnyNetwork } from "../networks/network";
import { MasterWallet } from "./masterwallet";
import { SerializedStandardMultiSigMasterWallet } from "./wallet.types";

export class StandardMultiSigMasterWallet extends MasterWallet {
  public static newFromSerializedWallet(serialized: SerializedStandardMultiSigMasterWallet): StandardMultiSigMasterWallet {
    let masterWallet = new StandardMultiSigMasterWallet();

    // Base type deserialization
    masterWallet.deserialize(serialized);

    return masterWallet;
  }

  protected deserialize(serialized: SerializedStandardMultiSigMasterWallet) {
    super.deserialize(serialized);

    // TODO: multisig specific data
  }

  public serialize(): StandardMultiSigMasterWallet {
    let serialized: StandardMultiSigMasterWallet = {} as StandardMultiSigMasterWallet; // Force empty

    super._serialize(serialized as StandardMultiSigMasterWallet);

    // TODO: multisig specific data

    return serialized;
  }

  public hasMnemonicSupport(): boolean {
    console.log("Multisig masterwallet hasMnemonicSupport not implemented");
    return true; // TODO - this hasMnemonicSupport() doesn't make enough sense, what does this mean?
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    console.log("Multisig masterwallet supportsNetwork not implemented");
    return true; // TODO: implement
  }
}
