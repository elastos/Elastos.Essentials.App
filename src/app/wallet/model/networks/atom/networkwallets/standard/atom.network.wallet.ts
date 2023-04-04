import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardCosmosNetworkWallet } from "../../../cosmos/networkwallets/standard/standard.cosmos.networkwallet";
import { CosmosTransactionProvider } from "../../../cosmos/tx-providers/cosmos.transaction.provider";

export class AtomNetworkWallet extends StandardCosmosNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new CosmosTransactionProvider(this);
  }
}