import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { EtherscanTransactionProvider } from "../../../evms/tx-providers/etherscan.tx.provider";

export class GnosisLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new EtherscanTransactionProvider(this);
  }
}