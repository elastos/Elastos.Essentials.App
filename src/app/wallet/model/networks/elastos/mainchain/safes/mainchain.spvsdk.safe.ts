import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SignTransactionResult } from "../../../../safes/safe.types";
import { SPVSDKSafe } from "../../../../safes/spvsdk.safe";
import { ElastosMainChainSafe } from "./mainchain.safe";

export class MainChainSPVSDKSafe extends SPVSDKSafe implements ElastosMainChainSafe {
  public createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string) {
    return SPVService.instance.createTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId, // From subwallet id
      JSON.stringify(inputs),
      JSON.stringify(outputs),
      fee,
      memo
    );
  }

  public async signTransaction(rawTransaction: string, transfer: Transfer): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(rawTransaction, transfer);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    // For mainchain, the signed created transaction is a json string.
    // We must convert it to a raw transaction first before publishing it.
    // So the real "sign transaction" format is the raw transaction
    let rawSignedTransaction = await SPVService.instance.convertToRawTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      txResult.signedTransaction);

    return {
      signedTransaction: rawSignedTransaction
    }
  }

  public getOwnerAddress(): Promise<string> {
    return SPVService.instance.getOwnerAddress(jsToSpvWalletId(this.masterWallet.id), this.chainId);
  }
}