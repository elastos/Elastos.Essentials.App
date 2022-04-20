export interface ElastosMainChainSafe {
  getOwnerAddress(): Promise<string>;
  createPaymentTransaction(inputs: string, outputs: string, fee: string, memo: string);
}
