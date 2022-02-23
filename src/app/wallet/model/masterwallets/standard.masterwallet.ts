import { SafeService, StandardWalletSafe } from "../../services/safe.service";
import { AESDecrypt } from "../crypto";
import { AnyNetwork } from "../networks/network";
import { MasterWallet } from "./masterwallet";
import { SerializedStandardMasterWallet } from "./wallet.types";

export class StandardMasterWallet extends MasterWallet {
  public hasPassphrase?: boolean;

  public static newFromSerializedWallet(serialized: SerializedStandardMasterWallet): StandardMasterWallet {
    let masterWallet = new StandardMasterWallet();

    // Base type deserialization
    masterWallet.deserialize(serialized);

    return masterWallet;
  }

  protected deserialize(serialized: SerializedStandardMasterWallet) {
    super.deserialize(serialized);

    this.hasPassphrase = serialized.hasPassphrase;

    // Save sensitive information to the safe
    let safe = this.getSafe();
    safe.seed = serialized.seed;
    safe.mnemonic = serialized.mnemonic;
    safe.privateKey = serialized.privateKey;
    safe.privateKeyType = serialized.privateKeyType;
  }

  public serialize(): SerializedStandardMasterWallet {
    let serialized: SerializedStandardMasterWallet = {} as SerializedStandardMasterWallet; // Force empty

    super._serialize(serialized as SerializedStandardMasterWallet);

    serialized.hasPassphrase = this.hasPassphrase;

    let safe = this.getSafe();
    serialized.mnemonic = safe.mnemonic;
    serialized.seed = safe.seed;
    serialized.privateKey = safe.privateKey;
    serialized.privateKeyType = safe.privateKeyType;

    return serialized;
  }

  public hasMnemonicSupport(): boolean {
    return !!this.getSafe().mnemonic; // A mnemonic must be defined
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    if (this.hasMnemonicSupport())
      return true; // If we have a mnemonic, we can run everywhere.

    return network.supportedPrivateKeyTypes().indexOf(this.getSafe().privateKeyType) >= 0;
  }

  /**
   * Returns the encrypted seed by default, or the decrypted one if the 
   * wallet pay password is provided.
   */
  public getSeed(decryptedWithPayPassword?: string): string {
    if (!this.getSafe().seed)
      return null;

    if (!decryptedWithPayPassword)
      return this.getSafe().seed;
    else
      return AESDecrypt(this.getSafe().seed, decryptedWithPayPassword);
  }

  /**
   * Returns the encrypted mnemonic by default, or the decrypted one if the 
   * wallet pay password is provided.
   */
  public getMnemonic(decryptedWithPayPassword?: string): string {
    if (!this.getSafe().mnemonic)
      return null;

    if (!decryptedWithPayPassword)
      return this.getSafe().mnemonic;
    else
      return AESDecrypt(this.getSafe().mnemonic, decryptedWithPayPassword);
  }

  /**
   * Returns the encrypted private key by default, or the decrypted one if the 
   * wallet pay password is provided.
   */
  public getPrivateKey(decryptedWithPayPassword?: string): string {
    if (!this.getSafe().privateKey)
      return null;

    if (!decryptedWithPayPassword)
      return this.getSafe().privateKey;
    else
      return AESDecrypt(this.getSafe().privateKey, decryptedWithPayPassword);
  }

  private getSafe(): StandardWalletSafe {
    return SafeService.instance.getStandardWalletSafe(this.id);
  }
}
