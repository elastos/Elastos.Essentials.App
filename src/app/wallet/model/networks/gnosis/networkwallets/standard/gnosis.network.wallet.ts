import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { GnosisTransactionProvider } from "../../tx-providers/gnosis.transaction.provider";

export class GnosisNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new GnosisTransactionProvider(this);
  }
}