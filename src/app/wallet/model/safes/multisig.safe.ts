import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { SignTransactionResult } from "./safe.types";

export interface MultiSigSafe {
  /**
   * Really sign the given transaction with the signing wallet
   */
  signTransactionReal(subWallet: AnySubWallet, rawTx: string): Promise<SignTransactionResult>;

  /**
   * Tells whether a cosigner, represented by his xpub key, has already signed a transaction or not.
   */
  hasCosignerSigned(xpub: string, tx: any): Promise<boolean>;

  /**
   * Tells if the signed transaction was signed by enough cosigners to be published.
   */
  hasEnoughSignaturesToPublish(signedTx: any): Promise<boolean>;
}
