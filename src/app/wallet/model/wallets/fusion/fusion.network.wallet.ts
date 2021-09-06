import { TransactionProvider } from "../../providers/transaction.provider";
import { EVMNetworkWallet } from "../evm.networkwallet";
import { FusionTransactionProvider } from "./providers/fusion.transaction.provider";

export class FusionNetworkWallet extends EVMNetworkWallet {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new FusionTransactionProvider(this);
  }
}