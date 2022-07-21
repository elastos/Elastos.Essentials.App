import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { AvalancheCChainTransactionProvider } from "../../tx-providers/avalanchecchain.transaction.provider";

export class AvalancheCChainLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new AvalancheCChainTransactionProvider(this);
  }
}