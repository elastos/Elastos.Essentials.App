import { TransactionProvider } from "../../providers/transaction.provider";
import { EVMNetworkWallet } from "../evm.networkwallet";
import { TelosTransactionProvider } from "./providers/telos.transaction.provider";

export class TelosNetworkWallet extends EVMNetworkWallet {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new TelosTransactionProvider(this);
  }
}