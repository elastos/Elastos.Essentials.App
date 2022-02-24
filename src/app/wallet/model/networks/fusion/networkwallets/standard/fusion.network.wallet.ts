import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { FusionTransactionProvider } from "../../tx-providers/fusion.transaction.provider";

export class FusionNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new FusionTransactionProvider(this);
  }
}