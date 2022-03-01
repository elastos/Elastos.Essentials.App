import { LedgerMasterWallet } from "./ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "./masterwallet";
import { StandardMultiSigMasterWallet } from "./standard.multisig.masterwallet";
import { SerializedLedgerMasterWallet, SerializedMasterWallet, SerializedStandardMasterWallet, SerializedStandardMultiSigMasterWallet, WalletType } from "./wallet.types";

export class MasterWalletBuilder {
  public static newFromSerializedWallet<SerializedWalletType extends SerializedMasterWallet>(serialized: SerializedWalletType): MasterWallet {
    switch (serialized.type) {
      case WalletType.STANDARD:
        return StandardMasterWallet.newFromSerializedWallet(serialized as SerializedStandardMasterWallet);
      case WalletType.LEDGER:
        return LedgerMasterWallet.newFromSerializedWallet(serialized as unknown as SerializedLedgerMasterWallet);
      case WalletType.MULTI_SIG_STANDARD:
        return StandardMultiSigMasterWallet.newFromSerializedWallet(serialized as unknown as SerializedStandardMultiSigMasterWallet);
      case WalletType.MULTI_SIG_EVM_GNOSIS:
        throw new Error("Master wallet type not implemented - " + serialized.type);
    }
  }
}