export interface EVMSafe {
  createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any>;
  createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any>;
}
