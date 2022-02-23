import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { FusionTransactionProvider } from "../../tx-providers/fusion.transaction.provider";

export class FusionNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new FusionTransactionProvider(this);
  }
}