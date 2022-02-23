import { LedgerMasterWallet } from "./ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "./masterwallet";
import { SerializedMasterWallet, WalletType } from "./wallet.types";

export class MasterWalletBuilder {
  public static newFromSerializedWallet<SerializedWalletType extends SerializedMasterWallet>(serialized: SerializedWalletType): MasterWallet {
    switch (serialized.type) {
      case WalletType.STANDARD:
        return StandardMasterWallet.newFromSerializedWallet(serialized);
      case WalletType.LEDGER:
        return LedgerMasterWallet.newFromSerializedWallet(serialized);
      case WalletType.MULTI_SIG_STANDARD:
      case WalletType.MULTI_SIG_EVM_GNOSIS:
        return null; // TODO
    }
  }
}