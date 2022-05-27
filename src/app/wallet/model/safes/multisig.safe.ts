import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { SignTransactionResult } from "./safe.types";

export interface MultiSigSafe {
  /**
   * Really sign the given transaction with the signing wallet
   */
  signTransactionReal(subWallet: AnySubWallet, rawTx: string): Promise<SignTransactionResult>;

  /**
   * Tells is the current user, one of the cosigners, has signed the transaction already.
   */
  hasSigningWalletSigned(tx: any): Promise<boolean>;

  /**
   * Tells whether a cosigner, represented by his xpub key, has already signed a transaction or not.
   */
  hasCosignerSigned(xpub: string, tx: any): Promise<boolean>;

  /**
   * Tells if the signed transaction was signed by enough cosigners to be published.
   */
  hasEnoughSignaturesToPublish(signedTx: any): Promise<boolean>;

  /**
   * Returns the hash of the raw / partly signed transaction currently in an offline transaction.
   * This method is mostly used to be able to match offline transactions with published transactions
   * so we can clenaup offline transactions locally.
   */
  getOfflineTransactionHash(tx: any): Promise<string>;
}
