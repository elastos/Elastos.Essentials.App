import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { EtherumTransactionProvider as EthereumTransactionProvider } from "../../tx-providers/ethereum.transaction.provider";

export class EthereumStandardNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new EthereumTransactionProvider(this);
  }
}