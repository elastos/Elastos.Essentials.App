import { FusionTransactionProvider } from "../../../tx-providers/fusion/fusion.transaction.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../evm.networkwallet";
import { StandardMasterWallet } from "../../masterwallet";

export class FusionNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new FusionTransactionProvider(this);
  }
}