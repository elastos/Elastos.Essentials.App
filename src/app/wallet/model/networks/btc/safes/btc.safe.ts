import { BTCOutputData, BTCSignDataType, BTCUTXO } from "../../../btc.types";

export interface BTCSafe {
  createBTCPaymentTransaction(inputs: BTCUTXO[], outputs: BTCOutputData[], changeAddress: string, feePerKB: string, fee: number): Promise<string>;
  signMessage(message: string): Promise<string>;
  signData(rawData: string, type: BTCSignDataType): Promise<string>;
}
