import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardEVMNetworkWallet } from "../../../evms/networkwallets/standard/standard.evm.networkwallet";
import { EtherscanTransactionProvider } from "../../../evms/tx-providers/etherscan.tx.provider";

export class FuseNetworkWallet extends StandardEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new EtherscanTransactionProvider(this);
  }
}