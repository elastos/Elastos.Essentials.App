import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { BaseChainTransactionProvider } from "../../tx-providers/basechain.transaction.provider";

export class BaseChainLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new BaseChainTransactionProvider(this);
  }
}
