import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { GnosisTransactionProvider } from "../../tx-providers/gnosis.transaction.provider";

export class GnosisLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new GnosisTransactionProvider(this);
  }
}