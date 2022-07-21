import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { FusionTransactionProvider } from "../../tx-providers/fusion.transaction.provider";

export class FusionLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new FusionTransactionProvider(this);
  }
}