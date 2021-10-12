import { TransactionProvider } from "../../providers/transaction.provider";
import { EVMNetworkWallet } from "../evm.networkwallet";
import { AvalancheCChainTransactionProvider } from "./providers/avalanchecchain.transaction.provider";

export class AvalancheCChainNetworkWallet extends EVMNetworkWallet {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new AvalancheCChainTransactionProvider(this);
  }
}