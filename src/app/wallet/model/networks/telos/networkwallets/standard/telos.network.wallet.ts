import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { TelosTransactionProvider } from "../../tx-providers/telos.transaction.provider";

export class TelosNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new TelosTransactionProvider(this);
  }
}