import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { BSCTransactionProvider } from "../../tx-providers/bsc.transaction.provider";

export class BSCLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new BSCTransactionProvider(this);
  }
}