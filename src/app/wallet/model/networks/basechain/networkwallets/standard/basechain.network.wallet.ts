import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { BaseChainTransactionProvider } from "../../tx-providers/basechain.transaction.provider";

export class BaseChainNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new BaseChainTransactionProvider(this);
  }
}
