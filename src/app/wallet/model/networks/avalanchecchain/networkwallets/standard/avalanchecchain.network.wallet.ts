import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { AvalancheCChainTransactionProvider } from "../../tx-providers/avalanchecchain.transaction.provider";

export class AvalancheCChainNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new AvalancheCChainTransactionProvider(this);
  }
} 