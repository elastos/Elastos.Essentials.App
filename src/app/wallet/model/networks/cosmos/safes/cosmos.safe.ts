import { Coin, IndexedTx, SearchTxFilter } from "@cosmjs/stargate";

export interface CosmosSafe {
  getAllBalance(): Promise<readonly Coin[]>;
  createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any>;
  createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any>;

  searchTx(filter?: SearchTxFilter): Promise<readonly IndexedTx[]>;
}
