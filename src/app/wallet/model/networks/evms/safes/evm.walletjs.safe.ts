import { EthSidechainSubWallet } from "@elastosfoundation/wallet-js-sdk";
import { json } from "@elastosfoundation/wallet-js-sdk/typings/types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { SignTransactionResult } from "../../../safes/safe.types";
import { WalletJSSafe } from "../../../safes/walletjs.safe";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { SignedETHSCTransaction } from "../evm.types";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMWalletJSSafe extends WalletJSSafe implements EVMSafe {

  public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return (<EthSidechainSubWallet>this.sdkSubWallet).createTransfer(
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
    return (<EthSidechainSubWallet>this.sdkSubWallet).createTransferGeneric(
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

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(subWallet, rawTransaction, transfer, forcePasswordPrompt, visualFeedback);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    let parsedSignedTransaction = <SignedETHSCTransaction>JSON.parse(txResult.signedTransaction);

    return { signedTransaction: parsedSignedTransaction.TxSigned };
  }
}