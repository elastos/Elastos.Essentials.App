import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { SignTransactionResult } from "./safe.types";

export interface MultiSigSafe {
  /**
   * Really sign the given transaction with the signing wallet
   */
  signTransactionReal(subWallet: AnySubWallet, rawTx: string): Promise<SignTransactionResult>;
}
