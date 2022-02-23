import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { AvalancheCChainTransactionProvider } from "../../tx-providers/avalanchecchain.transaction.provider";

export class AvalancheCChainNetworkWallet extends EVMNetworkWallet<StandardMasterWallet, any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new AvalancheCChainTransactionProvider(this);
  }
}