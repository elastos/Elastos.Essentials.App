import { AnyNetwork } from "../networks/network";
import { MasterWallet } from "./masterwallet";
import { SerializedStandardMultiSigMasterWallet } from "./wallet.types";

export class StandardMultiSigMasterWallet extends MasterWallet {
  public signingWalletId: string;
  public requiredSigners: number;
  public signersExtPubKeys: string[];

  public static newFromSerializedWallet(serialized: SerializedStandardMultiSigMasterWallet): StandardMultiSigMasterWallet {
    let masterWallet = new StandardMultiSigMasterWallet();

    // Base type deserialization
    masterWallet.deserialize(serialized);

    return masterWallet;
  }

  protected deserialize(serialized: SerializedStandardMultiSigMasterWallet) {
    super.deserialize(serialized);

    this.signingWalletId = serialized.signingWalletId;
    this.signersExtPubKeys = serialized.signersExtPubKeys;
    this.requiredSigners = serialized.requiredSigners;
  }

  public serialize(): StandardMultiSigMasterWallet {
    let serialized: StandardMultiSigMasterWallet = {} as StandardMultiSigMasterWallet; // Force empty

    super._serialize(serialized as StandardMultiSigMasterWallet);

    serialized.signingWalletId = this.signingWalletId;
    serialized.signersExtPubKeys = this.signersExtPubKeys;
    serialized.requiredSigners = this.requiredSigners;

    return serialized;
  }

  public hasMnemonicSupport(): boolean {
    console.log("Multisig masterwallet hasMnemonicSupport not implemented");
    return true; // TODO - this hasMnemonicSupport() doesn't make enough sense, what does this mean?
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    // Hardcoded for now - improve
    return [
      "elastos", // elastos mainchain
      //"btc" // BTC
    ].includes(network.key);
  }
}
