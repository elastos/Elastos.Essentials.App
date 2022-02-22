import { AvalancheCChainTransactionProvider } from "../../../tx-providers/avalanchecchain/avalanchecchain.transaction.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../evm.networkwallet";
import { StandardMasterWallet } from "../../masterwallet";

export class AvalancheCChainNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new AvalancheCChainTransactionProvider(this);
  }
}