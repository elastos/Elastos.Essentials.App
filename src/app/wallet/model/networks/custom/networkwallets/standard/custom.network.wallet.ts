import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { CustomTransactionProvider } from "../../tx-providers/custom.transaction.provider";

export class CustomNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new CustomTransactionProvider(this);
  }
}