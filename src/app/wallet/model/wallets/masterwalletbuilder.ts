import { SerializedMasterWallet, WalletType } from "../wallet.types";
import { MasterWallet, StandardMasterWallet } from "./masterwallet";

export class MasterWalletBuilder {
  public static newFromSerializedWallet<SerializedWalletType extends SerializedMasterWallet>(serialized: SerializedWalletType): MasterWallet {
    switch (serialized.type) {
      case WalletType.STANDARD:
        return StandardMasterWallet.newFromSerializedWallet(serialized);
      case WalletType.LEDGER:
      case WalletType.MULTI_SIGN_STANDARD:
      case WalletType.MULTI_SIGN_EVM_GNOSIS:
        return null; // TODO
    }
  }
}