import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SignTransactionResult } from "../../../safes/safe.types";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { SignedETHSCTransaction } from "../evm.types";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMSPVSDKSafe extends SPVSDKSafe implements EVMSafe {
  public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return SPVService.instance.createTransfer(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      toAddress,
      amount,
      6, // ETHER_ETHER
      gasPrice,
      0,
      gasLimit,
      nonce
    );
  }

  public createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
    return SPVService.instance.createTransferGeneric(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      contractAddress,
      amount,
      0, // WEI
      gasPrice,
      0, // WEI
      gasLimit,
      data,
      nonce
    );
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: string, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(subWallet, rawTransaction, transfer, forcePasswordPrompt, visualFeedback);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    let parsedSignedTransaction = <SignedETHSCTransaction>JSON.parse(txResult.signedTransaction);

    return { signedTransaction: parsedSignedTransaction.TxSigned };
  }
}