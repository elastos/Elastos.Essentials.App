import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { KavaTransactionProvider } from "../../tx-providers/kava.transaction.provider";

export class KavaLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new KavaTransactionProvider(this);
  }
}