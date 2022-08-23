import { BTCOutputData, BTCUTXO } from "../../../btc.types";

export interface BTCSafe {
  createBTCPaymentTransaction(inputs: BTCUTXO[], outputs: BTCOutputData[], changeAddress: string, feePerKB: string, fee: number): Promise<string>;
}
