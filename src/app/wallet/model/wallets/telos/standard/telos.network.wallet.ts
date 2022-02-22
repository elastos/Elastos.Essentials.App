import { TelosTransactionProvider } from "../../../tx-providers/telos/telos.transaction.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../evm.networkwallet";
import { StandardMasterWallet } from "../../masterwallet";

export class TelosNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new TelosTransactionProvider(this);
  }
}