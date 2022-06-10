import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";

export interface ElastosMainChainSafe {
  getOwnerAddress(): Promise<string>;
  getOwnerPublicKey(): Promise<string>;
  createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any>;
}
