import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SPVSDKSafe } from "../../../safes/spvsdk.safe";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMSPVSDKSafe extends SPVSDKSafe implements EVMSafe {
  public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return SPVService.instance.createTransfer(
        jsToSpvWalletId(this.masterWallet.id),
        this.chainId,
        toAddress,
        amount,
        6, // ETHER_ETHER
        gasPrice,
        0,
        gasLimit,
        nonce
      );
  }

  public createContractTransaction(contractAddress: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
    return SPVService.instance.createTransferGeneric(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      contractAddress,
      '0',
      0, // WEI
      gasPrice,
      0, // WEI
      gasLimit,
      data,
      nonce
    );
  }
}