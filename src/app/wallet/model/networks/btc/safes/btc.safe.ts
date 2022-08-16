export interface BTCSafe {
  createBTCPaymentTransaction(inputs: any, outputs: any, changeAddress: string, feePerKB: string, fee: number): Promise<string>;
}
