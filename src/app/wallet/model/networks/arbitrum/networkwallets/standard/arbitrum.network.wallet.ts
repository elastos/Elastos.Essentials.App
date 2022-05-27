import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { ArbitrumTransactionProvider } from "../../tx-providers/arbitrum.transaction.provider";

export class ArbitrumNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ArbitrumTransactionProvider(this);
  }
}