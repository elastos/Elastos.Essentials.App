import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { ArbitrumTransactionProvider } from "../../tx-providers/arbitrum.transaction.provider";

export class ArbitrumLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ArbitrumTransactionProvider(this);
  }
}