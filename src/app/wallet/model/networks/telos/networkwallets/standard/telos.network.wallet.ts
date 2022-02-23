import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { TelosTransactionProvider } from "../../tx-providers/telos.transaction.provider";

export class TelosNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new TelosTransactionProvider(this);
  }
}