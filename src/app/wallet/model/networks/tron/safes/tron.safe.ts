
export interface TronSafe {
    createTransferTransaction(toAddress: string, amount: string): Promise<any>;
    createContractTransaction(contractAddress: string, amount: string, data: any): Promise<any>;
}
