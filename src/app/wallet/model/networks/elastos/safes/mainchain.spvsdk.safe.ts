import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SignTransactionResult } from "../../../safes/safe.types";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";

export class MainChainSPVSDKSafe extends SPVSDKSafe {
  public async signTransaction(rawTransaction: string, transfer: Transfer): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(rawTransaction, transfer);

    console.log("MAINCHAIN signTransaction txResult", txResult)

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    // For mainchain, the signed created transaction is a json string.
    // We must convert it to a raw transaction first before publishing it.
    // So the real "sign transaction" format is the raw transaction
    let rawSignedTransaction = await SPVService.instance.convertToRawTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      txResult.signedTransaction);


    console.log("MAINCHAIN signTransaction rawSignedTransaction", rawSignedTransaction)

    return {
      signedTransaction: rawSignedTransaction
    }
  }
}